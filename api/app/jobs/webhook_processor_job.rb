# frozen_string_literal: true

# ============================================================================
# WebhookProcessorJob — procesa payloads recibidos por los webhook controllers.
# ============================================================================
# Diseñado para ser idempotente y tolerante a payloads parciales. El controller
# del webhook responde 200 inmediatamente y deja todo el trabajo aquí, así
# evitamos timeouts del proveedor.
#
# Tipos soportados (kind):
#   "meta" (alias meta_ads) → Ads::MetaLeadProcessor
#   "google" (alias google_ads) → Ads::GoogleLeadProcessor
#   "whatsapp_twilio" → procesa inbound de Twilio (integración provider twilio)
#   "whatsapp_cloud"  → procesa inbound de Meta Cloud API
#
# Persiste el payload en AuditEvent al inicio para tener trazabilidad ISO.
# ============================================================================
class WebhookProcessorJob < ApplicationJob
  queue_as :integrations

  # Meta Cloud API — statuses[].status → enum WhatsappMessage
  WHATSAPP_CLOUD_DELIVERY_STATUS_MAP = {
    "sent"       => "sent",
    "delivered"  => "delivered",
    "read"       => "read",
    "failed"     => "failed",
    "pending"    => "queued"
  }.freeze

  # Reintentos específicos para errores de red contra Meta/Google.
  retry_on Faraday::Error, wait: :polynomially_longer, attempts: 5

  def perform(kind, payload)
    audit_received(kind, payload)

    case kind
    when "meta", "meta_ads" then Ads::MetaLeadProcessor.new(payload).call
    when "google", "google_ads" then Ads::GoogleLeadProcessor.new(payload).call
    when "whatsapp_twilio" then process_whatsapp_twilio(payload)
    when "whatsapp_cloud"  then process_whatsapp_cloud(payload)
    else
      Rails.logger.warn("[WebhookProcessorJob] kind desconocido: #{kind}")
    end
  end

  # ===========================================================================

  private

  def audit_received(kind, payload)
    AuditEvent.create!(
      tenant:      nil, # se resuelve adentro del processor
      user:        nil,
      action:      "webhook_received",
      entity_type: "Webhook",
      entity_id:   nil,
      metadata:    { kind: kind, keys: payload.keys.first(20) },
      ip_address:  payload["remote_ip"],
      user_agent:  payload["user_agent"]
    )
  rescue StandardError => e
    Rails.logger.warn("[WebhookProcessorJob] no se pudo auditar: #{e.message}")
  end

  # --- WhatsApp inbound (Twilio) -----------------------------------------

  def process_whatsapp_twilio(payload)
    payload = stringify_webhook_payload(payload)
    sid = payload["MessageSid"].presence || payload["SmsSid"].presence
    msg_status = payload["MessageStatus"].presence || payload["SmsStatus"]
    inbound = twilio_inbound_payload?(payload)

    # Callback sólo estado (saliente típico: queued → sent → delivered / failed).
    if sid.present? && msg_status.present? && !inbound
      record = WhatsappMessage.unscoped.find_by(provider: "twilio", provider_message_id: sid)
      if record
        ActsAsTenant.with_tenant(record.tenant) do
          apply_twilio_delivery_status(record, msg_status.to_s, payload)
        end
      else
        Rails.logger.info(
          "[WhatsApp Twilio] status webhook sin mensaje conocido sid=#{sid} status=#{msg_status}"
        )
      end
      return
    end

    return unless inbound

    to_number   = payload["To"].to_s.sub(/\Awhatsapp:/, "")
    from_number = payload["From"].to_s.sub(/\Awhatsapp:/, "")
    integration = AdIntegration.unscoped.where(provider: "twilio")
                               .find_by(account_identifier: to_number) ||
                  resolve_tenant_by_setting("whatsapp.number", to_number)
    tenant      = integration.respond_to?(:tenant) ? integration.tenant : integration
    return Rails.logger.warn("[WhatsApp Twilio] no tenant para to=#{to_number}") unless tenant

    ActsAsTenant.with_tenant(tenant) do
      if sid.present? && tenant.whatsapp_messages.exists?(provider: "twilio", provider_message_id: sid)
        Rails.logger.info("[WhatsApp Twilio] duplicado MessageSid=#{sid}")
        return
      end

      contact = upsert_contact(tenant, from_number)
      tenant.whatsapp_messages.create!(
        contact:             contact,
        direction:           "in",
        provider:            "twilio",
        provider_message_id: sid || payload["MessageSid"],
        from_number:         from_number,
        to_number:           to_number,
        body:                payload["Body"],
        media_url:           payload["MediaUrl0"],
        status:              "delivered",
        raw_payload:         payload
      )
    end
  end

  # --- WhatsApp inbound (Cloud API) --------------------------------------

  def process_whatsapp_cloud(payload)
    Array(payload["entry"]).each do |entry|
      Array(entry["changes"]).each do |change|
        value = change["value"] || {}
        meta_phone_id = value.dig("metadata", "phone_number_id").to_s
        next Rails.logger.warn("[WhatsApp Cloud] phone_number_id vacío") if meta_phone_id.blank?

        integration = AdIntegration.unscoped.where(provider: "whatsapp_cloud")
                                   .find_by(account_identifier: meta_phone_id)
        tenant        = integration&.tenant
        tenant      ||= resolve_tenant_by_setting("whatsapp.cloud_phone_id", meta_phone_id)
        next Rails.logger.warn("[WhatsApp Cloud] sin tenant para phone_number_id=#{meta_phone_id}") unless tenant

        ActsAsTenant.with_tenant(tenant) do
          Array(value["statuses"]).each { |st| apply_whatsapp_cloud_status_callback(st) }

          Array(value["messages"]).each do |m|
            sid = m["id"].presence
            if sid.present? &&
               tenant.whatsapp_messages.where(provider: "whatsapp_cloud", provider_message_id: sid).exists?
              next
            end

            from = m["from"]
            profile_name = profile_name_from_cloud_contacts(value["contacts"], from)
            contact = upsert_contact(tenant, from, profile_name: profile_name)
            tenant.whatsapp_messages.create!(
              contact:             contact,
              direction:           "in",
              provider:            "whatsapp_cloud",
              provider_message_id: sid,
              from_number:         from,
              to_number:           cloud_inbound_to_number(value["metadata"]),
              body:                inbound_body_from_cloud_message(m),
              media_url:           inbound_media_url_from_cloud_message(m),
              status:              "delivered",
              raw_payload:         m
            )
          end
        end
      end
    end
  end

  def resolve_tenant_by_setting(path, value)
    Tenant.where("settings #>> ? = ?", "{#{path.split('.').join(',')}}", value.to_s).first
  end

  def upsert_contact(tenant, phone, profile_name: nil)
    normalized = Phonelib.parse(phone).sanitized
    contact = tenant.contacts.find_by(phone_normalized: normalized)
    return contact if contact

    first_name, last_part = split_whatsapp_profile_name(profile_name)
    last_name = last_part.presence || normalized.last(4).presence || "wa"

    tenant.contacts.create!(
      first_name:       first_name,
      last_name:        last_name,
      phone_e164:       phone,
      phone_normalized: normalized,
      source_kind:      "whatsapp",
      source_label:     "inbound"
    )
  end

  def split_whatsapp_profile_name(name)
    return ["Contacto", nil] if name.blank?

    parts = name.to_s.strip.split(/\s+/, 2)
    [parts[0].presence || "Contacto", parts[1]]
  end

  def profile_name_from_cloud_contacts(contacts, wa_from)
    Array(contacts).each do |c|
      next if c["wa_id"].to_s != wa_from.to_s

      return c.dig("profile", "name").to_s.strip.presence
    end
    nil
  end

  def cloud_inbound_to_number(metadata)
    raw = metadata&.dig("display_phone_number").to_s.strip
    return raw if raw.blank?

    e164 = Phonelib.parse(raw).e164
    return e164 if e164.present?

    digits = raw.gsub(/\D/, "")
    digits.present? ? "+#{digits}" : raw
  end

  def inbound_body_from_cloud_message(m)
    case m["type"].to_s
    when "text"
      m.dig("text", "body")
    when "button"
      m.dig("button", "text")
    when "interactive"
      m.dig("interactive", "button_reply", "title") ||
        m.dig("interactive", "list_reply", "title")
    else
      m.dig("text", "body")
    end
  end

  def inbound_media_url_from_cloud_message(m)
    return if m.blank?

    inner = m[m["type"].to_s]
    return unless inner.is_a?(Hash)

    # Meta suele mandar `id` de media, no URL; sólo persistimos si viene enlace explícito.
    inner["link"].presence
  end

  def stringify_webhook_payload(payload)
    h = payload.respond_to?(:to_unsafe_h) ? payload.to_unsafe_h : payload.to_h
    h.stringify_keys
  end

  def twilio_inbound_payload?(payload)
    payload["Body"].present? ||
      payload["MediaUrl0"].present? ||
      payload["NumMedia"].to_i.positive?
  end

  def apply_twilio_delivery_status(msg, twilio_raw_status, payload)
    key = twilio_raw_status.to_s.downcase
    mapped = WhatsApp::Adapters::Twilio::STATUS_MAP[key] || msg.status

    attrs = { status: mapped }
    attrs[:sent_at] = Time.current if mapped.to_s == "sent" && msg.sent_at.blank?
    attrs[:delivered_at] = Time.current if mapped.to_s == "delivered" && msg.delivered_at.blank?
    attrs[:read_at] = Time.current if mapped.to_s == "read" && msg.read_at.blank?

    if %w[failed undelivered].include?(key) || payload["ErrorCode"].present?
      attrs[:error_message] = twilio_status_callback_error(payload, key).presence ||
                              "Twilio (#{twilio_raw_status})"
    end

    msg.update!(attrs)
  rescue ActiveRecord::RecordInvalid => e
    Rails.logger.warn("[WhatsApp Twilio] no se pudo actualizar estado: #{e.message}")
  end

  def twilio_status_callback_error(payload, twilio_raw_status)
    parts = []
    parts << payload["ErrorMessage"].presence || payload.fetch("SmsStatus", nil)
    parts << "(código #{payload['ErrorCode']})" if payload["ErrorCode"].present?
    parts.compact.join(" ").presence || twilio_raw_status.to_s
  end

  def apply_whatsapp_cloud_status_callback(st)
    sid = st["id"].presence
    return if sid.blank?

    msg = WhatsappMessage.unscoped.find_by(provider: "whatsapp_cloud", provider_message_id: sid)
    return unless msg

    key = st["status"].to_s.downcase
    mapped = WHATSAPP_CLOUD_DELIVERY_STATUS_MAP[key] || msg.status

    attrs = { status: mapped }
    attrs[:sent_at] = Time.current if mapped.to_s == "sent" && msg.sent_at.blank?
    attrs[:delivered_at] = Time.current if mapped.to_s == "delivered" && msg.delivered_at.blank?
    attrs[:read_at] = Time.current if mapped.to_s == "read" && msg.read_at.blank?

    if mapped.to_s == "failed" || st["errors"].present?
      attrs[:error_message] = format_whatsapp_cloud_status_errors(st).presence ||
                              "WhatsApp Cloud (#{st['status']})"
    end

    ActsAsTenant.with_tenant(msg.tenant) do
      msg.update!(attrs)
    end
  rescue ActiveRecord::RecordInvalid => e
    Rails.logger.warn("[WhatsApp Cloud] no se pudo actualizar estado: #{e.message}")
  end

  def format_whatsapp_cloud_status_errors(st)
    errs = st["errors"]
    return unless errs.is_a?(Array) && errs.any?

    errs.filter_map do |e|
      next e.to_s unless e.is_a?(Hash)

      [e["code"], e["title"], e["message"]].compact.join(": ").presence
    end.join(" | ").presence
  end
end
