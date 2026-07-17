# frozen_string_literal: true

# ============================================================================
# Devise JWT — sesiones stateless para el SPA
# ============================================================================
Devise.setup do |config|
  # ----------------------------------------------------------------------
  # Lockable — bloqueo de cuenta tras intentos fallidos (defensa adicional
  # a Rack::Attack, RFC §7 / ISO A.8.2). Estrategia de desbloqueo por
  # TIEMPO (no email): esta es una API-only sin rutas `unlock` montadas,
  # así que el flujo por email de Devise rompería con
  # `undefined method 'user_unlock_url'`.
  # ----------------------------------------------------------------------
  config.lock_strategy   = :failed_attempts
  config.unlock_strategy = :time
  config.unlock_in       = 5.minutes
  config.maximum_attempts = 5

  config.jwt do |jwt|
    jwt.secret =
      ENV["DEVISE_JWT_SECRET_KEY"].presence ||
      Rails.application.credentials.devise_jwt_secret_key.presence ||
      (Rails.env.production? ? nil : Rails.application.secret_key_base)

    jwt.dispatch_requests = [
      ["POST", %r{^/api/v1/sessions$}],
      ["POST", %r{^/api/v1/sessions/refresh$}]
    ]
    jwt.revocation_requests = [
      ["DELETE", %r{^/api/v1/sessions$}]
    ]
    jwt.expiration_time = 15.minutes.to_i
  end
end
