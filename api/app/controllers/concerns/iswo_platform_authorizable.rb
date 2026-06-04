# frozen_string_literal: true

# Solo administradores del tenant plataforma ISWO pueden usar /api/v1/admin/tenants.
module IswoPlatformAuthorizable
  extend ActiveSupport::Concern

  PLATFORM_TENANT_SLUG = "iswo"

  private

  def authenticate_iswo_platform_admin!
    slug = request.headers["X-Tenant-Slug"].to_s.strip.downcase
    unless slug == PLATFORM_TENANT_SLUG
      render json: {
        error:   "forbidden",
        message: "El onboarding de tenants solo está disponible desde el tenant ISWO."
      }, status: :forbidden
      return
    end

    authenticate_user!
    return if performed?

    platform = Tenant.kept.find_by(slug: PLATFORM_TENANT_SLUG)
    unless platform && current_user&.tenant_id == platform.id && current_user.role_admin?
      render json: {
        error:   "forbidden",
        message: "Solo un administrador del tenant ISWO puede crear otros tenants."
      }, status: :forbidden
    end
  end
end
