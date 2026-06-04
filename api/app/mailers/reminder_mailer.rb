# frozen_string_literal: true

# ============================================================================
# ReminderMailer — notifica al usuario cuando un Reminder vence.
# ============================================================================
# Se invoca desde ReminderNotificationJob:
#   ReminderMailer.with(reminder: r).due_notification.deliver_later
# ============================================================================
class ReminderMailer < ApplicationMailer
  def due_notification
    assign_reminder_context
    return if @user&.email.blank?

    tenant_email_headers
    mail(
      to:      @user.email,
      subject: "🔔 Recordatorio: #{@reminder.subject}"
    )
  end

  # Confirmación al crear (global — todos los canales).
  def created_confirmation
    assign_reminder_context
    return if @user&.email.blank?

    tenant_email_headers
    mail(
      to:      @user.email,
      subject: "✅ Recordatorio programado: #{@reminder.subject}"
    )
  end

  # Aviso previo si sigue pendiente y no completado.
  def upcoming_due_notification
    assign_reminder_context
    @minutes_until = minutes_until_due
    return if @user&.email.blank?

    tenant_email_headers
    mail(
      to:      @user.email,
      subject: "⏳ Recordatorio por vencer: #{@reminder.subject}"
    )
  end

  private

  def assign_reminder_context
    @reminder    = params[:reminder]
    @user        = @reminder.user
    @opportunity = @reminder.opportunity
    @contact     = @opportunity&.contact
  end

  def minutes_until_due
    return 0 if @reminder.remind_at.blank?

    [((@reminder.remind_at - Time.current) / 60).ceil, 1].max
  end
end
