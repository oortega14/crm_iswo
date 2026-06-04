# frozen_string_literal: true

# Resuelve tenant en login y forgot-password (email sin selector de empresa).
module LoginTenantResolvable
  extend ActiveSupport::Concern

  private

  def resolve_login_tenant_from_credentials!
    slug = tenant_slug_from_header
    slug = nil if slug == Auth::LoginTenantResolver::AUTO_SLUG

    result = Auth::LoginTenantResolver.call(
      slug:           slug,
      email:          params.dig(:user, :email) || params[:email],
      subdomain_slug: tenant_slug_from_subdomain
    )

    apply_login_tenant_result!(result)
    return if performed?

    set_request_tenant!(@current_tenant) if @current_tenant
  end

  def set_request_tenant!(tenant)
    @current_tenant = tenant
    ActsAsTenant.current_tenant = tenant
  end

  def apply_login_tenant_result!(result)
    case result.status
    when :ok
      @current_tenant = result.tenant
    when :ambiguous
      render json: {
        error:   "tenant_ambiguous",
        message: "Este correo está asociado a varias empresas. Indica cuál quieres usar.",
        tenants: result.tenants
      }, status: :unprocessable_entity
    when :not_found
      render_tenant_not_found(result.slug)
    when :inactive
      render_tenant_inactive
    when :missing_email
      render json: {
        error:   "tenant_missing",
        message: "Indica tu correo electrónico para identificar tu empresa."
      }, status: :bad_request
    when :no_account
      if action_name == "forgot"
        head :accepted
      else
        render json: {
          error:   "unauthorized",
          message: "Correo o contraseña incorrectos."
        }, status: :unauthorized
      end
    else
      render_tenant_missing
    end
  end
end
