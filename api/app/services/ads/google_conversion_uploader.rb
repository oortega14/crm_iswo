# frozen_string_literal: true

module Ads
  # ==========================================================================
  # Ads::GoogleConversionUploader — sube una conversión offline a Google Ads.
  # ==========================================================================
  # Flujo:
  #   1. Intercambia refresh_token → access_token (OAuth2).
  #   2. Llama POST customers/{customer_id}:uploadClickConversions con el gclid
  #      de la oportunidad, fecha/hora de cierre y valor estimado.
  #
  # Credenciales requeridas en AdIntegration.credentials (Google):
  #   - refresh_token
  #   - customer_id          → ID de cuenta Google Ads (solo dígitos o con guiones)
  #   - conversion_action_id → ID de la acción de conversión en Google Ads
  #   - developer_token      → token de desarrollador de la API (o ENV GOOGLE_ADS_DEVELOPER_TOKEN)
  #   - login_customer_id    → (opcional) ID de cuenta MCC/manager
  #
  # ENV requeridos en el servidor:
  #   GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET
  # ==========================================================================
  class GoogleConversionUploader
    OAUTH_URL   = "https://oauth2.googleapis.com"
    API_BASE    = "https://googleads.googleapis.com"
    API_VERSION = "v17"
    TIMEOUT     = 15

    Result = Struct.new(:ok, :message, :partial_errors, keyword_init: true) do
      def success? = ok
    end

    def initialize(integration:, gclid:, conversion_datetime:, conversion_value:, currency_code: "COP")
      @integration        = integration
      @creds              = (integration.credentials || {}).stringify_keys
      @gclid              = gclid.to_s.strip
      @conversion_datetime = conversion_datetime
      @conversion_value   = conversion_value.to_f
      @currency_code      = currency_code.to_s.upcase
    end

    def call
      return fail_result("gclid vacío — la oportunidad no proviene de un clic de Google Ads") if @gclid.blank?

      access_token = fetch_access_token
      return access_token if access_token.is_a?(Result) # error en refresh

      upload_conversion(access_token)
    rescue Faraday::Error => e
      Rails.logger.error("[GoogleConversionUploader] red: #{e.class} #{e.message}")
      fail_result("Error de red al contactar Google Ads: #{e.message.truncate(200)}")
    rescue StandardError => e
      Rails.logger.error("[GoogleConversionUploader] #{e.class}: #{e.message}")
      fail_result("Error inesperado: #{e.message.truncate(200)}")
    end

    # =========================================================================

    private

    def fetch_access_token
      client_id     = ENV["GOOGLE_ADS_CLIENT_ID"].to_s.strip
      client_secret = ENV["GOOGLE_ADS_CLIENT_SECRET"].to_s.strip
      refresh_token = @creds["refresh_token"].to_s.strip

      if client_id.blank? || client_secret.blank?
        return fail_result("Faltan GOOGLE_ADS_CLIENT_ID / GOOGLE_ADS_CLIENT_SECRET en el servidor")
      end
      return fail_result("Falta refresh_token en las credenciales de Google Ads") if refresh_token.blank?

      conn = oauth_conn
      res  = conn.post("/token", {
        client_id:     client_id,
        client_secret: client_secret,
        refresh_token: refresh_token,
        grant_type:    "refresh_token"
      })

      body = res.body.is_a?(Hash) ? res.body : {}
      token = body["access_token"].to_s.strip

      if res.success? && token.present?
        token
      else
        err  = body["error"].to_s
        desc = body["error_description"].to_s
        Rails.logger.warn("[GoogleConversionUploader] OAuth fallo: #{res.status} #{err} #{desc}")
        hint = err == "invalid_grant" ? "Refresh token revocado o expirado — vuelve a autorizar la cuenta." : "#{err}: #{desc}"
        fail_result("No se pudo obtener access_token de Google: #{hint}")
      end
    end

    def upload_conversion(access_token)
      customer_id         = normalize_customer_id(@creds["customer_id"] || @integration.account_identifier)
      conversion_action_id = @creds["conversion_action_id"].to_s.strip
      developer_token     = developer_token_value
      login_customer_id   = @creds["login_customer_id"].to_s.strip.presence

      if customer_id.blank?
        return fail_result("Falta customer_id en las credenciales o account_identifier de la integración Google")
      end
      if conversion_action_id.blank?
        return fail_result("Falta conversion_action_id en las credenciales de Google Ads")
      end
      if developer_token.blank?
        return fail_result("Falta developer_token (credenciales o ENV GOOGLE_ADS_DEVELOPER_TOKEN)")
      end

      body = {
        conversions: [
          {
            gclid:            @gclid,
            conversionAction: "customers/#{customer_id}/conversionActions/#{conversion_action_id}",
            conversionDateTime: format_datetime(@conversion_datetime),
            conversionValue:  @conversion_value,
            currencyCode:     @currency_code
          }
        ],
        partialFailure: true
      }

      headers = build_headers(access_token, developer_token, login_customer_id)
      conn    = api_conn
      path    = "/#{API_VERSION}/customers/#{customer_id}:uploadClickConversions"

      res = conn.post(path) do |req|
        req.headers.merge!(headers)
        req.body = body.to_json
      end

      parse_upload_response(res, customer_id)
    end

    def parse_upload_response(res, customer_id)
      body = res.body.is_a?(Hash) ? res.body : {}

      if res.success?
        partial = Array(body["partialFailureError"]).filter_map { |e| e["message"] }.presence
        if partial
          Rails.logger.warn("[GoogleConversionUploader] partial failure customer=#{customer_id}: #{partial}")
          return Result.new(ok: false, message: "Partial failure de Google Ads", partial_errors: partial)
        end
        Result.new(ok: true, message: nil, partial_errors: [])
      else
        detail = body.dig("error", "message") || body.dig("error", "status") || res.status.to_s
        Rails.logger.warn("[GoogleConversionUploader] HTTP #{res.status} customer=#{customer_id}: #{detail}")
        fail_result("Google Ads rechazó la conversión (#{res.status}): #{detail.to_s.truncate(300)}")
      end
    end

    def build_headers(access_token, developer_token, login_customer_id)
      h = {
        "Authorization"    => "Bearer #{access_token}",
        "developer-token"  => developer_token,
        "Content-Type"     => "application/json"
      }
      h["login-customer-id"] = login_customer_id if login_customer_id.present?
      h
    end

    def developer_token_value
      @creds["developer_token"].to_s.strip.presence ||
        ENV["GOOGLE_ADS_DEVELOPER_TOKEN"].to_s.strip.presence
    end

    def normalize_customer_id(raw)
      raw.to_s.gsub(/\D/, "")
    end

    def format_datetime(dt)
      dt = dt.in_time_zone("UTC") if dt.respond_to?(:in_time_zone)
      dt.strftime("%Y-%m-%d %H:%M:%S+00:00")
    end

    def oauth_conn
      Faraday.new(url: OAUTH_URL) do |f|
        f.request  :url_encoded
        f.response :json
        f.options.timeout      = TIMEOUT
        f.options.open_timeout = TIMEOUT
      end
    end

    def api_conn
      Faraday.new(url: API_BASE) do |f|
        f.response :json, content_type: /\bjson$/
        f.options.timeout      = TIMEOUT
        f.options.open_timeout = TIMEOUT
      end
    end

    def fail_result(message)
      Result.new(ok: false, message: message, partial_errors: [])
    end
  end
end
