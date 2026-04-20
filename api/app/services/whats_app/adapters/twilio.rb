# frozen_string_literal: true

module WhatsApp
  module Adapters
    # ==========================================================================
    # WhatsApp::Adapters::Twilio — envío de mensajes vía Twilio Messaging API.
    # ==========================================================================
    # Endpoint:  https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json
    # Auth:      HTTP Basic (Account SID : Auth Token)
    # Body:      form-urlencoded con From/To/Body[/MediaUrl]
    # Números:   prefijados con "whatsapp:" (ej: whatsapp:+573001234567)
    #
    # Credenciales (ordenadas por prioridad):
    #   1. tenant.settings["whatsapp"]["twilio_account_sid"] / ..._auth_token / ..._from
    #   2. ENV: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER
    #
    # Respuesta exitosa (201):
    #   { "sid": "SMxxxx", "status": "queued", ... }
    # ==========================================================================
    class Twilio < Base
      API_VERSION = "2010-04-01"
      BASE_URL    = "https://api.twilio.com"

      # Map del status de Twilio al enum del modelo.
      STATUS_MAP = {
        "queued"      => "queued",
        "sending"     => "queued",
        "sent"        => "sent",
        "delivered"   => "delivered",
        "read"        => "read",
        "failed"      => "failed",
        "undelivered" => "failed"
      }.freeze

      def deliver(message)
        account_sid = tenant_setting(:twilio_account_sid, "TWILIO_ACCOUNT_SID")
        auth_token  = tenant_setting(:twilio_auth_token,  "TWILIO_AUTH_TOKEN")
        from_number = message.from_number.presence ||
                      tenant_setting(:twilio_from, "TWILIO_WHATSAPP_NUMBER")

        raise_delivery!("Credenciales Twilio incompletas para tenant #{@tenant.id}") if
          account_sid.blank? || auth_token.blank? || from_number.blank?

        payload = {
          "From" => "whatsapp:#{normalize_e164(from_number)}",
          "To"   => "whatsapp:#{normalize_e164(message.to_number)}",
          "Body" => message.body.to_s
        }
        payload["MediaUrl"] = message.media_url if message.media_url.present?

        conn = faraday(base_url: BASE_URL)
        conn.set_basic_auth(account_sid, auth_token) if conn.respond_to?(:set_basic_auth)

        path = "/#{API_VERSION}/Accounts/#{account_sid}/Messages.json"
        res  = conn.post(path) do |req|
          # Faraday < 2: set_basic_auth sí existe; Faraday 2.x: hay que setear el header.
          req.headers["Authorization"] = "Basic #{Base64.strict_encode64("#{account_sid}:#{auth_token}")}"
          req.body = payload
        end

        unless res.success?
          err = (res.body.is_a?(Hash) && (res.body["message"] || res.body["error"])) || "HTTP #{res.status}"
          raise_delivery!("Twilio: #{err}")
        end

        body = res.body.is_a?(Hash) ? res.body : {}
        {
          provider_message_id: body["sid"],
          status:              STATUS_MAP[body["status"]] || "sent"
        }
      end
    end
  end
end
