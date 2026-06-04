# frozen_string_literal: true

# ============================================================================
# BriefingMailer — resumen diario personalizado por usuario.
# ============================================================================
# Se invoca desde DailyBriefingJob:
#   BriefingMailer.with(briefing: hash).daily_briefing.deliver_later
# ============================================================================
class BriefingMailer < ApplicationMailer
  def daily_briefing
    briefing       = params[:briefing]
    @user          = briefing[:user]
    @tenant        = briefing[:tenant]
    @kpis          = briefing[:kpis]
    @hot_leads     = briefing[:hot_leads]
    @overdue       = briefing[:overdue_reminders]
    @stale_leads   = briefing[:stale_leads]
    @pending       = briefing[:pending_reminders]
    @day_recommendation = briefing[:day_recommendation]
    @generated_at  = briefing[:generated_at]

    return if @user.email.blank?

    tenant_email_headers
    mail(
      to:      @user.email,
      subject: "📊 Tu briefing del #{I18n.l(@generated_at, format: :short) rescue @generated_at.strftime('%d %b %Y')}"
    )
  end
end
