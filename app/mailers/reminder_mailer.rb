# frozen_string_literal: true

# ============================================================================
# ReminderMailer — notifica al usuario cuando un Reminder vence.
# ============================================================================
# Se invoca desde ReminderNotificationJob:
#   ReminderMailer.with(reminder: r).due_notification.deliver_later
# ============================================================================
class ReminderMailer < ApplicationMailer
  def due_notification
    @reminder    = params[:reminder]
    @user        = @reminder.user
    @opportunity = @reminder.opportunity
    @contact     = @opportunity&.contact || @reminder.contact

    return if @user&.email.blank?

    tenant_email_headers
    mail(
      to:      @user.email,
      subject: "🔔 Recordatorio: #{@reminder.title}"
    )
  end
end
