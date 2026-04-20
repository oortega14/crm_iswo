# frozen_string_literal: true

# ============================================================================
# CORS — permite al SPA React (TanStack) en otro origen consumir el API.
# ============================================================================
# Configurar `CORS_ALLOWED_ORIGINS` como lista separada por comas.
# Para producción, usar el dominio completo del SPA (ej.
# https://app.crm.iswo.com.co).
# ----------------------------------------------------------------------------

allowed = ENV.fetch("CORS_ALLOWED_ORIGINS", "http://localhost:5173")
             .split(",")
             .map(&:strip)

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(*allowed)

    resource "/api/*",
      headers: :any,
      methods: %i[get post put patch delete options head],
      expose: %w[Authorization Current-Page Page-Items Total-Pages Total-Count],
      credentials: true,
      max_age: 600
  end
end
