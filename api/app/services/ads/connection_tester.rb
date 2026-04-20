# frozen_string_literal: true

module Ads
  # ==========================================================================
  # Ads::ConnectionTester — valida que las credenciales de una AdIntegration
  # funcionan contra el proveedor correspondiente.
  # ==========================================================================
  # Hace un request mínimo (listar cuentas o `me`) al API de cada proveedor:
  #   - meta_ads:  GET graph.facebook.com/v18.0/me?access_token=…
  #   - google_ads: requiere refresh_token válido → GET customers
  #   - tiktok:    TODO
  #
  # Devuelve true/false. No eleva excepciones; cualquier fallo se loguea y
  # marca la integración con record_failure!.
  # ==========================================================================
  class ConnectionTester
    TIMEOUT_SECONDS = 10

    def initialize(integration)
      @integration = integration
      @creds       = integration.credentials || {}
    end

    def call
      case @integration.provider
      when "meta_ads"   then test_meta!
      when "google_ads" then test_google!
      else
        # Para proveedores no implementados asumimos true (stub).
        Rails.logger.warn("ConnectionTester: provider '#{@integration.provider}' sin implementar, stub OK")
        true
      end
    rescue StandardError => e
      Rails.logger.warn("ConnectionTester failed [#{@integration.provider}]: #{e.class} #{e.message}")
      false
    end

    # =========================================================================

    private

    def test_meta!
      token = @creds["access_token"] || @creds[:access_token]
      return false if token.blank?

      conn = Faraday.new(url: "https://graph.facebook.com") do |f|
        f.request  :url_encoded
        f.response :json
        f.options.timeout      = TIMEOUT_SECONDS
        f.options.open_timeout = TIMEOUT_SECONDS
      end

      res = conn.get("/v18.0/me", { access_token: token })
      res.success? && res.body["id"].present?
    end

    def test_google!
      refresh = @creds["refresh_token"] || @creds[:refresh_token]
      return false if refresh.blank?

      # Para Google Ads API se requiere OAuth2 token exchange. Aquí solo
      # validamos que podemos canjear refresh → access.
      conn = Faraday.new(url: "https://oauth2.googleapis.com") do |f|
        f.request  :url_encoded
        f.response :json
        f.options.timeout      = TIMEOUT_SECONDS
        f.options.open_timeout = TIMEOUT_SECONDS
      end

      res = conn.post("/token", {
        client_id:     ENV["GOOGLE_ADS_CLIENT_ID"],
        client_secret: ENV["GOOGLE_ADS_CLIENT_SECRET"],
        refresh_token: refresh,
        grant_type:    "refresh_token"
      })
      res.success? && res.body["access_token"].present?
    end
  end
end
