# frozen_string_literal: true

# ============================================================================
# Devise JWT — sesiones stateless para el SPA
# ============================================================================
# Access token: 15 minutos, devuelto en body para Authorization header.
# Revocación: denylist persistida en Postgres (tabla jwt_denylists).
# El refresh token de 7 días se gestiona aparte en SessionsController como
# cookie httpOnly/Secure/SameSite=Lax.
# ----------------------------------------------------------------------------

Devise.setup do |config|
  config.jwt do |jwt|
    jwt.secret          = ENV.fetch("DEVISE_JWT_SECRET_KEY")
    jwt.dispatch_requests = [
      ["POST", %r{^/api/v1/sessions$}]
    ]
    jwt.revocation_requests = [
      ["DELETE", %r{^/api/v1/sessions$}]
    ]
    jwt.expiration_time = 15.minutes.to_i
  end
end
