# frozen_string_literal: true

module Ads
  # ==========================================================================
  # Ads::ConnectionTester — valida que las credenciales de una AdIntegration
  # funcionan contra el proveedor correspondiente.
  # ==========================================================================
  # Hace un request mínimo (listar cuentas o `me`) al API de cada proveedor:
  #   - meta_ads:  GET graph.facebook.com/v18.0/me?access_token=…
  #   - google_ads: requiere refresh_token válido → POST oauth2/token (refresh)
  #   - twilio:      GET /2010-04-01/Accounts/{Sid}.json
  #   - whatsapp_cloud: GET graph.facebook.com/{v}/me?access_token=… (detecta OAuth 190)
  #
  # `test` devuelve Result con mensaje seguro para UI (sin secretos).
  # `call` se mantiene por compatibilidad (solo true/false).
  # ==========================================================================
  class ConnectionTester
    TIMEOUT_SECONDS = 10

    Result = Struct.new(:ok, :message, keyword_init: true) do
      def success?
        ok
      end
    end

    def initialize(integration)
      @integration = integration
      @creds       = integration.credentials || {}
    end

    def call
      test.success?
    end

    def test
      case @integration.provider
      when "meta"            then test_meta
      when "google"          then test_google
      when "twilio"          then test_twilio
      when "whatsapp_cloud"
        test_whatsapp_cloud
      else
        Rails.logger.warn("ConnectionTester: provider '#{@integration.provider}' sin implementar, stub OK")
        Result.new(ok: true, message: nil)
      end
    rescue StandardError => e
      Rails.logger.warn("ConnectionTester failed [#{@integration.provider}]: #{e.class} #{e.message}")
      Result.new(ok: false, message: "Error inesperado al probar la conexión. Revisa los logs del servidor.")
    end

    # =========================================================================

    private

    def test_meta
      token = @creds["access_token"] || @creds[:access_token]
      return fail_result("Falta access_token en las credenciales de Meta.") if token.blank?

      conn = Faraday.new(url: "https://graph.facebook.com") do |f|
        f.request  :url_encoded
        f.response :json
        f.options.timeout      = TIMEOUT_SECONDS
        f.options.open_timeout = TIMEOUT_SECONDS
      end

      res = conn.get("/v18.0/me", { access_token: token })
      if res.success? && res.body.is_a?(Hash) && res.body["id"].present?
        Result.new(ok: true, message: nil)
      else
        detail = res.body.is_a?(Hash) ? res.body.dig("error", "message") : res.body.to_s
        Rails.logger.warn("ConnectionTester meta: #{res.status} #{detail}")
        fail_result("Meta rechazó el token (Graph API). Renueva el access token en la app de Meta.")
      end
    end

    # GET /2010-04-01/Accounts/{Sid}.json — misma autenticación que envío de mensajes.
    def test_twilio
      creds = @creds.stringify_keys
      sid   = scrub(creds["account_sid"])
      tok   = scrub(creds["auth_token"])
      return fail_result("Faltan account_sid o auth_token en las credenciales de Twilio.") if sid.blank? || tok.blank?

      unless sid.start_with?("AC")
        return fail_result(
          "Twilio: el Account SID debe empezar por «AC» (Consola Twilio → Account). " \
          "No uses el API Key SID (empieza por «SK») en el campo Account SID. " \
          "Origen de credenciales: #{twilio_integration_origin_label}."
        )
      end

      conn = Faraday.new(url: "https://api.twilio.com") do |f|
        f.request  :url_encoded
        f.response :json, content_type: /\bjson$/
        f.options.timeout      = TIMEOUT_SECONDS
        f.options.open_timeout = TIMEOUT_SECONDS
      end

      path = "/2010-04-01/Accounts/#{sid}.json"
      res  = conn.get(path) do |req|
        req.headers["Authorization"] =
          "Basic #{Base64.strict_encode64("#{sid}:#{tok}")}"
      end

      if res.success?
        Result.new(ok: true, message: nil)
      else
        msg = res.body.is_a?(Hash) ? res.body["message"] : res.body.to_s
        Rails.logger.warn("ConnectionTester twilio: #{res.status} #{msg}")
        hint =
          if res.status == 401
            "Credenciales Twilio incorrectas o token revocado; revisa SID y Auth Token en la consola Twilio."
          else
            "Twilio respondió con error (#{res.status}). Comprueba SID y Auth Token."
          end
        fail_result(hint)
      end
    end

    def scrub(val)
      s = val.to_s.strip
      s.delete_prefix('"').delete_suffix('"').delete_prefix("'").delete_suffix("'").presence
    end

    def scrub_whatsapp_cloud_token(val)
      s = val.to_s.gsub(/[\r\n]/, "").strip
      s = s.delete_prefix('"').delete_suffix('"').delete_prefix("'").delete_suffix("'")
      s = s.sub(/\Abearer\s+/i, "").strip if s.match?(/\Abearer\s+/i)
      s.presence
    end

    # Valida que el access_token sea OAuth parseable (evita 190 al enviar mensajes).
    def test_whatsapp_cloud
      creds = @creds.stringify_keys
      token = scrub_whatsapp_cloud_token(creds["access_token"])
      return fail_result("Falta access_token en las credenciales de WhatsApp Cloud.") if token.blank?

      api_version = ENV["WHATSAPP_CLOUD_API_VERSION"].to_s.strip
      api_version =
        if api_version.blank?
          "v18.0"
        else
          api_version.start_with?("v") ? api_version : "v#{api_version.delete_prefix('v')}"
        end

      conn = Faraday.new(url: "https://graph.facebook.com") do |f|
        f.request  :url_encoded
        f.response :json
        f.options.timeout      = TIMEOUT_SECONDS
        f.options.open_timeout = TIMEOUT_SECONDS
      end

      res = conn.get("/#{api_version}/me", { access_token: token })
      if res.success? && res.body.is_a?(Hash) && res.body["id"].present?
        Result.new(ok: true, message: nil)
      else
        err    = res.body.is_a?(Hash) ? res.body["error"] : {}
        detail = err["message"] || res.body.to_s
        code   = err["code"]
        hint =
          if code.to_i == 190
            "Token OAuth inválido (190): en Meta Business Suite → Configuración → Usuarios → Usuarios del sistema " \
              "genera un token para esta app con permisos whatsapp_business_messaging (no uses App Secret ni el texto «Bearer » dentro del campo)."
          else
            "Meta rechazó el token en Graph API /me: #{detail}#{" (code #{code})" if code}"
          end
        Rails.logger.warn("ConnectionTester whatsapp_cloud: #{res.status} #{detail}")
        fail_result(hint)
      end
    end

    def twilio_integration_origin_label
      "integración Twilio en CRM (id #{@integration.id})"
    end

    def test_google
      refresh = @creds["refresh_token"] || @creds[:refresh_token]
      return fail_result("Falta refresh_token en las credenciales de Google Ads.") if refresh.blank?

      client_id     = ENV["GOOGLE_ADS_CLIENT_ID"].to_s.strip
      client_secret = ENV["GOOGLE_ADS_CLIENT_SECRET"].to_s.strip
      if client_id.blank? || client_secret.blank?
        return fail_result(
          "En el servidor del API deben estar definidas las variables GOOGLE_ADS_CLIENT_ID y " \
          "GOOGLE_ADS_CLIENT_SECRET (OAuth de la consola Google Cloud). Copia .env.example y reinicia el proceso."
        )
      end

      conn = Faraday.new(url: "https://oauth2.googleapis.com") do |f|
        f.request  :url_encoded
        f.response :json
        f.options.timeout      = TIMEOUT_SECONDS
        f.options.open_timeout = TIMEOUT_SECONDS
      end

      res = conn.post("/token", {
        client_id:     client_id,
        client_secret: client_secret,
        refresh_token: refresh,
        grant_type:    "refresh_token"
      })

      if res.success? && res.body.is_a?(Hash) && res.body["access_token"].present?
        Result.new(ok: true, message: nil)
      else
        err = res.body.is_a?(Hash) ? res.body["error"] : nil
        desc = res.body.is_a?(Hash) ? res.body["error_description"] : res.body.to_s
        Rails.logger.warn("ConnectionTester google: #{res.status} #{err} #{desc}")
        hint =
          case err
          when "invalid_grant"
            "Google rechazó el refresh_token (revocado o expirado). Vuelve a autorizar la cuenta OAuth."
          when "invalid_client"
            "GOOGLE_ADS_CLIENT_ID o GOOGLE_ADS_CLIENT_SECRET no coinciden con el proyecto OAuth."
          else
            "No se pudo obtener access_token de Google (#{err.presence || res.status}). Revisa OAuth y el refresh token."
          end
        fail_result(hint)
      end
    end

    def fail_result(message)
      Result.new(ok: false, message: message)
    end
  end
end
