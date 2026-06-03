# frozen_string_literal: true

# Autenticación por SUPER_ADMIN_TOKEN (header X-Admin-Token).
module SuperAdminAuthenticatable
  extend ActiveSupport::Concern

  private

  def authenticate_super_admin!
    expected = ENV["SUPER_ADMIN_TOKEN"].to_s.strip
    if expected.blank?
      render json: {
        error:   "service_unavailable",
        message: "SUPER_ADMIN_TOKEN no está configurado en el servidor. " \
                  "Añádelo a api/.env y reinicia Rails (bundle exec rails server)."
      }, status: :service_unavailable
      return
    end

    token = request.headers["X-Admin-Token"].to_s.strip
    unless secure_admin_token?(token, expected)
      render json: {
        error:   "unauthorized",
        message: "Token de administrador inválido. Debe coincidir exactamente con SUPER_ADMIN_TOKEN en api/.env."
      }, status: :unauthorized
      return
    end
  end

  def secure_admin_token?(provided, expected)
    digest = ->(value) { Digest::SHA256.hexdigest(value.to_s) }
    ActiveSupport::SecurityUtils.secure_compare(digest.call(provided), digest.call(expected))
  end
end
