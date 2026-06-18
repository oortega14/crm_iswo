# frozen_string_literal: true

# Solo administradores del tenant plataforma (super-admin) pueden usar /api/v1/admin/tenants.
module PlatformTenantAuthorizable
  extend ActiveSupport::Concern

  included do
    around_action :with_platform_tenant_context
    before_action :authenticate_platform_tenant_admin!
  end

  attr_reader :current_tenant

  private

  def with_platform_tenant_context
    slug = platform_tenant_slug_from_header
    unless PlatformTenant.slug?(slug)
      render json: {
        error:   "forbidden",
        message: "El onboarding de tenants solo está disponible desde el tenant plataforma (#{PlatformTenant::SLUG})."
      }, status: :forbidden
      return
    end

    @current_tenant = ActsAsTenant.without_tenant { Tenant.kept.find_by(slug: slug) }
    unless @current_tenant
      render json: {
        error:   "tenant_not_found",
        message: "No existe el tenant plataforma «#{PlatformTenant::SLUG}». Ejecuta: bin/rails db:seed"
      }, status: :bad_request
      return
    end

    ActsAsTenant.with_tenant(@current_tenant) { yield }
  end

  def authenticate_platform_tenant_admin!
    authenticate_user!
    return if performed?

    unless current_user&.tenant_id == current_tenant.id && current_user.role_admin?
      render json: {
        error:   "forbidden",
        message: "Solo un administrador del tenant plataforma puede gestionar el onboarding de tenants."
      }, status: :forbidden
    end
  end

  def platform_tenant_slug_from_header
    request.headers["X-Tenant-Slug"].to_s.strip.downcase
  end
end
