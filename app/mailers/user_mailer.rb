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

  def build_login_url(tenant)
    host = ENV.fetch("SPA_HOST", "https://crm.iswo.com.co")
    "#{host.sub('https://', "https://#{tenant.slug}.")}/login"
  end

  def build_reset_url(tenant, token)
    host = ENV.fetch("SPA_HOST", "https://crm.iswo.com.co")
    "#{host.sub('https://', "https://#{tenant.slug}.")}/reset-password?token=#{token}"
  end
end
