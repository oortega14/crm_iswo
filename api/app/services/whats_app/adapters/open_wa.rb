# frozen_string_literal: true

module WhatsApp
  module Adapters
    # ==========================================================================
    # WhatsApp::Adapters::OpenWa — envío vía OpenWA (auto-hospedado).
    # ==========================================================================
    # OpenWA expone una REST API sobre whatsapp-web.js. No requiere cuenta
    # Business de Meta ni Twilio, pero viola los ToS de WhatsApp.
    #
    # Endpoint:  POST {url}/api/sessions/{sessionId}/messages/send-text
    # Auth:      Header X-API-Key
    # Body:      JSON { chatId: "628123456789@c.us", text: "..." }
    #
    # Credenciales (por prioridad):
    #   1. tenant.settings["whatsapp"]["openwa_url"] / ..._api_key / ..._session_id
    #   2. AdIntegration(provider: openwa) → url/api_key en credentials,
    #      session_id en account_identifier
    #   3. ENV: OPENWA_URL, OPENWA_API_KEY, OPENWA_SESSION_ID
    # ==========================================================================
    class OpenWa < Base
      def deliver(message)
        url, api_key, session_id = openwa_credentials

        raise_delivery!("Credenciales OpenWA incompletas para tenant #{@tenant.id}. " \
                         "Configura url, api_key y session_id en Ajustes → Integraciones (OpenWA).") if
          url.blank? || api_key.blank? || session_id.blank?

        chat_id = normalize_openwa_chat_id(message.to_number)

        conn = Faraday.new(url: url) do |f|
          f.request  :json
          f.response :json, content_type: /\bjson$/
          f.options.timeout      = DEFAULT_TIMEOUT
          f.options.open_timeout = DEFAULT_TIMEOUT
        end

        res = conn.post("/api/sessions/#{session_id}/messages/send-text") do |req|
          req.headers["X-API-Key"]    = api_key
          req.headers["Content-Type"] = "application/json"
          req.body = { chatId: chat_id, text: message.body.to_s }
        end

        unless res.success?
          raise_delivery!("OpenWA: HTTP #{res.status} — #{extract_openwa_error(res.body)}")
        end

        body   = res.body.is_a?(Hash) ? res.body : {}
        msg_id = body["id"].is_a?(Hash) ? body["id"]["_serialized"].to_s : body["id"].to_s
        {
          provider_message_id: msg_id.presence,
          status:              "sent"
        }
      end

      private

      def openwa_credentials
        url        = tenant_setting(:openwa_url,        "OPENWA_URL")
        api_key    = tenant_setting(:openwa_api_key,    "OPENWA_API_KEY")
        session_id = tenant_setting(:openwa_session_id, "OPENWA_SESSION_ID")

        if url.blank? || api_key.blank? || session_id.blank?
          integ = @tenant.preferred_openwa_integration
          if integ
            creds      = (integ.credentials || {}).stringify_keys
            url        = url.presence        || creds["url"].presence
            api_key    = api_key.presence    || creds["api_key"].presence
            session_id = session_id.presence || integ.account_identifier.presence ||
                         creds["session_id"].presence
          end
        end

        [url&.strip&.chomp("/"), api_key&.strip, session_id&.strip]
      end

      # Convierte E.164 (+628123456789) al chatId de whatsapp-web.js (628123456789@c.us)
      def normalize_openwa_chat_id(number)
        digits = number.to_s.strip.delete_prefix("+").gsub(/\D/, "")
        "#{digits}@c.us"
      end

      def extract_openwa_error(body)
        return "respuesta inválida" unless body.is_a?(Hash)

        body["message"] || body["error"] || body.to_s.truncate(200)
      end
    end
  end
end
