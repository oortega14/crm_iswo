# frozen_string_literal: true

# ============================================================================
# WebhookProcessorJob — procesa payloads recibidos por los webhook controllers.
# ============================================================================
# Diseñado para ser idempotente y tolerante a payloads parciales. El controller
# del webhook responde 200 inmediatamente y deja todo el trabajo aquí, así
# evitamos timeouts del proveedor.
#
# Tipos soportados (kind):
#   "meta_ads"        → Ads::MetaLeadProcessor
#   "google_ads"      → Ads::GoogleLeadProcessor
#   "whatsapp_twilio" → procesa inbound de Twilio
#   "whatsapp_cloud"  → procesa inbound de Meta Cloud API
#
# Persiste el payload en AuditEvent al inicio para tener trazabilidad ISO.
# ============================================================================
class WebhookProcessorJob < ApplicationJob
  queue_as :integrations

  # Reintentos específicos para errores de red contra Meta/Google.
  retry_on Faraday::Error, wait: :polynomially_longer, attempts: 5

  def perform(kind, payload)
    audit_received(kind, payload)

    case kind
    when "meta_ads"        then Ads::MetaLeadProcessor.new(payload).call
    when "google_ads"      then Ads::GoogleLeadProcessor.new(payload).call
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
      tenant: nil, # se resuelve adentro del processor
      user:   nil,
      action: "webhook_received",
      auditable_type: "Webhook",
      auditable_id:   nil,
      changes_data: { kind: kind, keys: payload.keys.first(20) },
      ip_address: payload["remote_ip"],
      user_agent: payload["user_agent"]
    )
  rescue StandardError => e
    Rails.logger.warn("[WebhookProcessorJob] no se pudo auditar: #{e.message}")
  end

  # --- WhatsApp inbound (Twilio) -----------------------------------------

  def process_whatsapp_twilio(payload)
    to_number   = payload["To"].to_s.sub(/\Awhatsapp:/, "")
    from_number = payload["From"].to_s.sub(/\Awhatsapp:/, "")
    integration = AdIntegration.where(provider: "whatsapp_twilio").find_by(account_identifier: to_number) ||
                  resolve_tenant_by_setting("whatsapp.number", to_number)
    tenant      = integration.respond_to?(:tenant) ? integration.tenant : integration
    return Rails.logger.warn("[WhatsApp Twilio] no tenant para to=#{to_number}") unless tenant

    ActsAsTenant.with_tenant(tenant) do
      contact = upsert_contact(tenant, from_number)
      tenant.whatsapp_messages.create!(
        contact:             contact,
        direction:           "in",
        provider:            "twilio",
        provider_message_id: payload["MessageSid"],
        from_number:         from_number,
        to_number:           to_number,
        body:                payload["Body"],
        media_url:           payload["MediaUrl0"],
        status:              "received",
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
        tenant = resolve_tenant_by_setting("whatsapp.cloud_phone_id", meta_phone_id)
        next Rails.logger.warn("[WhatsApp Cloud] sin tenant para phone_number_id=#{meta_phone_id}") unless tenant

        ActsAsTenant.with_tenant(tenant) do
          Array(value["messages"]).each do |m|
            from = m["from"]
            contact = upsert_contact(tenant, from)
            tenant.whatsapp_messages.create!(
              contact:             contact,
              direction:           "in",
              provider:            "cloud",
              provider_message_id: m["id"],
              from_number:         from,
              to_number:           value.dig("metadata", "display_phone_number"),
              body:                m.dig("text", "body"),
              status:              "received",
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

  def upsert_contact(tenant, phone)
    normalized = Phonelib.parse(phone).sanitized
    contact = tenant.contacts.find_by(phone_normalized: normalized)
    return contact if contact

    tenant.contacts.create!(
      first_name:       "Contacto",
      last_name:        normalized.last(4),
      phone_e164:       phone,
      phone_normalized: normalized,
      source_kind:      "whatsapp",
      source_label:     "inbound"
    )
  end
end
