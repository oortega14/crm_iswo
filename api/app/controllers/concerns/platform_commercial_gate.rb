# frozen_string_literal: true

# Bloquea endpoints del CRM comercial cuando la sesión es del tenant plataforma.
module PlatformCommercialGate
  extend ActiveSupport::Concern

  PLATFORM_ALLOWED_CONTROLLERS = %w[
    me
    users
    audit_events
    tenants
  ].freeze

  included do
    before_action :deny_commercial_api_for_platform_tenant!
  end

  private

  def deny_commercial_api_for_platform_tenant!
    return unless current_tenant && PlatformTenant.slug?(current_tenant.slug)
    return if PLATFORM_ALLOWED_CONTROLLERS.include?(controller_name)

    render json: {
      error:   "forbidden",
      message: "El tenant plataforma no tiene acceso al CRM comercial."
    }, status: :forbidden
  end
end
