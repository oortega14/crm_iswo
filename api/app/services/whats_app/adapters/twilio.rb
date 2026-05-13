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
    #   1. tenant.settings["whatsapp"]["twilio_account_sid"] / ..._auth_token
    #   2. integración AdIntegration (provider twilio) — account_sid / auth_token
    #   3. ENV: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER
    #
    # Respuesta exitosa (201):
    #   { "sid": "SMxxxx", "status": "queued", ... }
    # ==========================================================================
    class Twilio < Base
      API_VERSION = "2010-04-01"
      BASE_URL    = "https://api.twilio.com"

      # Map del status de Twilio al enum del modelo.
      STATUS_MAP = {
        "initiated"   => "queued",
        "queued"      => "queued",
        "sending"     => "queued",
        "sent"        => "sent",
        "delivered"   => "delivered",
        "read"        => "read",
        "failed"      => "failed",
        "undelivered" => "failed"
      }.freeze

      def deliver(message)
        account_sid, auth_token, creds_source = twilio_credentials
        from_number = message.from_number.presence ||
                      tenant_setting(:twilio_from, "TWILIO_WHATSAPP_NUMBER")

        raise_delivery!("Credenciales Twilio incompletas para tenant #{@tenant.id}") if
          account_sid.blank? || auth_token.blank? || from_number.blank?

        if account_sid.present? && !account_sid.start_with?("AC")
          raise_delivery!(
            "Twilio: el Account SID debe empezar por «AC» (Consola Twilio → Account). " \
            "No uses el API Key SID (empieza por «SK») en el campo Account SID. " \
            "Origen de credenciales: #{creds_source}."
          )
        end

        payload = {
          "From" => "whatsapp:#{normalize_e164(from_number)}",
          "To"   => "whatsapp:#{normalize_e164(message.to_number)}",
          "Body" => message.body.to_s
        }
        payload["MediaUrl"] = message.media_url if message.media_url.present?

        # Twilio notifica entrega / fallo con POST a esta URL. Sin ella solo vemos «queued»
        # hasta que llegue otro medio (y en local necesitas API público tipo ngrok).
        status_cb = status_callback_url
        payload["StatusCallback"] = status_cb if status_cb

        conn = faraday(base_url: BASE_URL)
        conn.set_basic_auth(account_sid, auth_token) if conn.respond_to?(:set_basic_auth)

        path = "/#{API_VERSION}/Accounts/#{account_sid}/Messages.json"
        res  = conn.post(path) do |req|
          # Faraday < 2: set_basic_auth sí existe; Faraday 2.x: hay que setear el header.
          req.headers["Authorization"] = "Basic #{Base64.strict_encode64("#{account_sid}:#{auth_token}")}"
          req.body = payload
        end

        unless res.success?
          err    = twilio_http_error_message(res)
          detail = if res.status == 401 && err.match?(/invalid username|authenticate/i)
                     "#{err} Verifica que Account SID (AC…) y Auth Token sean del **mismo** subcuenta en " \
                     "Twilio Console → Account → API keys & tokens (copiar sin espacios). Origen: #{creds_source}."
                   else
                     err
                   end
          raise_delivery!("Twilio: #{detail}")
        end

        body = parse_twilio_json_body(res.body)
        {
          provider_message_id: body["sid"],
          status:              STATUS_MAP[body["status"]] || "sent"
        }
      end

      private

      def status_callback_url
        root = ENV.fetch("API_PUBLIC_ORIGIN", "").to_s.strip.chomp("/")
        return nil if root.blank?

        "#{root}/api/v1/webhooks/whatsapp/twilio"
      end

      # Retorna [account_sid, auth_token, origen_descriptivo] para mensajes de error.
      def twilio_credentials
        sid = scrub_twilio_secret(tenant_setting(:twilio_account_sid, "TWILIO_ACCOUNT_SID"))
        tok = scrub_twilio_secret(tenant_setting(:twilio_auth_token,  "TWILIO_AUTH_TOKEN"))
        had_partial_env = sid.present? || tok.present?

        integ = nil
        if sid.blank? || tok.blank?
          integ = @tenant.preferred_twilio_integration
          if integ
            creds = (integ.credentials || {}).stringify_keys
            sid ||= scrub_twilio_secret(creds["account_sid"])
            tok ||= scrub_twilio_secret(creds["auth_token"])
            sid ||= scrub_twilio_secret(creds["Account SID"] || creds["account_sid_live"])
            tok ||= scrub_twilio_secret(creds["Auth Token"] || creds["authToken"])
          end
        end

        origen =
          if sid.blank? || tok.blank?
            "credenciales incompletas"
          elsif integ && had_partial_env && sid.present? && tok.present?
            "mezcla ENV/settings + integración Twilio en CRM (##{integ.id})"
          elsif integ && sid.present? && tok.present?
            "integración Twilio en CRM (id #{integ.id})"
          else
            "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN o tenant.settings"
          end

        [sid, tok, origen]
      end

      def parse_twilio_json_body(raw)
        case raw
        when Hash then raw
        when String then JSON.parse(raw)
        else {}
        end
      rescue JSON::ParserError
        {}
      end

      def scrub_twilio_secret(value)
        s = value.to_s.strip
        # Quita comillas envolventes típicas al pegar desde .env
        s = s.delete_prefix('"').delete_suffix('"').delete_prefix("'").delete_suffix("'")
        s.presence
      end

      def twilio_http_error_message(res)
        body = res.body
        hash =
          case body
          when Hash then body
          when String
            JSON.parse(body)
          else
            {}
          end
        hash["message"] || hash["error"] || "HTTP #{res.status}"
      rescue JSON::ParserError
        body.to_s.truncate(200)
      end
    end
  end
end
