# frozen_string_literal: true

# ============================================================================
# ExportMailer — notifica al usuario que su export está listo (o falló).
# ============================================================================
# Se invoca desde ExportGenerationJob al finalizar:
#   ExportMailer.with(export: e).ready.deliver_later
#   ExportMailer.with(export: e).failed.deliver_later
# ============================================================================
class ExportMailer < ApplicationMailer
  def ready
    @export = params[:export]
    @user   = @export.user
    return if @user&.email.blank?

    tenant_email_headers
    mail(
      to:      @user.email,
      subject: "📄 Tu export de #{@export.resource} está listo"
    )
  end

  def failed
    @export = params[:export]
    @user   = @export.user
    return if @user&.email.blank?

    tenant_email_headers
    mail(
      to:      @user.email,
      subject: "❌ Tu export de #{@export.resource} falló"
    )
  end
end
