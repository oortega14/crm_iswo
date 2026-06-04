# frozen_string_literal: true

# Solo administradores del tenant plataforma (super-admin) pueden usar /api/v1/admin/tenants.
module PlatformTenantAuthorizable
  extend ActiveSupport::Concern

  private

  def authenticate_platform_tenant_admin!
    slug = request.headers["X-Tenant-Slug"].to_s.strip.downcase
    unless PlatformTenant.slug?(slug)
      render json: {
        error:   "forbidden",
        message: "El onboarding de tenants solo está disponible desde el tenant plataforma (#{PlatformTenant::SLUG})."
      }, status: :forbidden
      return
    end

    authenticate_user!
    return if performed?

    platform = Tenant.kept.find_by(slug: slug)
    unless platform && current_user&.tenant_id == platform.id && current_user.role_admin?
      render json: {
        error:   "forbidden",
        message: "Solo un administrador del tenant plataforma puede crear otros tenants."
      }, status: :forbidden
    end
  end
end
