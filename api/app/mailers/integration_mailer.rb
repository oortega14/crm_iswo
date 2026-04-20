# frozen_string_literal: true

# ============================================================================
# IntegrationMailer — notifica problemas con AdIntegrations.
# ============================================================================
# Se invoca desde AdSyncJob cuando una integración se pausa por fallos
# consecutivos:
#   IntegrationMailer.with(integration: i, user: admin).paused.deliver_later
# ============================================================================
class IntegrationMailer < ApplicationMailer
  def paused
    @integration = params[:integration]
    @user        = params[:user]
    return if @user&.email.blank?

    tenant_email_headers
    mail(
      to:      @user.email,
      subject: "⚠️ Integración #{@integration.provider} pausada por fallos"
    )
  end

  def reconnected
    @integration = params[:integration]
    @user        = params[:user]
    return if @user&.email.blank?

    tenant_email_headers
    mail(
      to:      @user.email,
      subject: "✅ Integración #{@integration.provider} reconectada"
    )
  end
end
