# frozen_string_literal: true

# ============================================================================
# UserMailer — onboarding de asesores.
# ============================================================================
# - welcome:            al crearse un usuario desde la API (UsersController).
# - password_reset:     invocado desde PasswordsController#forgot.
# - account_activated:  al reactivar un usuario previamente deshabilitado.
# ============================================================================
class UserMailer < ApplicationMailer
  def welcome
    @user          = params[:user]
    @invite_token  = params[:invite_token] # opcional: link de primer login
    @login_url     = build_login_url(@user.tenant)

    tenant_email_headers
    mail(
      to:      @user.email,
      subject: "Bienvenido/a a #{@user.tenant.name}"
    )
  end

  def password_reset
    @user       = params[:user]
    @reset_token = params[:reset_token]
    @reset_url  = build_reset_url(@user.tenant, @reset_token)

    tenant_email_headers
    mail(
      to:      @user.email,
      subject: "Restablecer tu contraseña — #{@user.tenant.name}"
    )
  end

  def account_activated
    @user      = params[:user]
    @login_url = build_login_url(@user.tenant)

    tenant_email_headers
    mail(
      to:      @user.email,
      subject: "Tu cuenta ha sido reactivada — #{@user.tenant.name}"
    )
  end

  private

  def spa_base_url
    ENV.fetch("SPA_HOST", "http://localhost:3001").to_s.strip.chomp("/")
  end

  # Enlace al SPA (sin subdominio wildcard): ?tenant=slug para X-Tenant-Slug en el cliente.
  def build_login_url(tenant)
    q = URI.encode_www_form("tenant" => tenant.slug)
    "#{spa_base_url}/login?#{q}"
  end

  def build_reset_url(tenant, token)
    q = URI.encode_www_form("token" => token, "tenant" => tenant.slug)
    "#{spa_base_url}/reset-password?#{q}"
  end
end
