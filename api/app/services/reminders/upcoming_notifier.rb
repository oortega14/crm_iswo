# frozen_string_literal: true

module Reminders
  # Aviso previo (correo + campana) cuando el recordatorio está por vencer y sigue pendiente.
  class UpcomingNotifier
    def self.call(reminder:)
      new(reminder: reminder).call
    end

    def initialize(reminder:)
      @reminder = reminder
    end

    def call
      return false unless Reminders::StaffRecipient.eligible?(@reminder.user)
      return false unless @reminder.status_pending?
      return false if @reminder.remind_at.blank? || @reminder.remind_at <= Time.current

      deliver_email!
      notify_in_app!
      @reminder.mark_upcoming_notified!
      true
    rescue StandardError => e
      Rails.logger.warn("[Reminders::UpcomingNotifier] reminder=#{@reminder.id}: #{e.message}")
      false
    end

    private

    def deliver_email!
      return false if @reminder.user&.email.blank?
      return false unless defined?(ReminderMailer)

      ReminderMailer.with(reminder: @reminder).upcoming_due_notification.deliver_now
      true
    end

    def notify_in_app!
      return false if @reminder.opportunity.nil?

      mins = minutes_until
      Notification.create!(
        tenant:   @reminder.tenant,
        user:     @reminder.user,
        kind:     "reminder_upcoming",
        title:    "Recordatorio por vencer",
        body:     "«#{@reminder.subject}» vence en aprox. #{mins} min. Aún está pendiente.",
        resource: @reminder.opportunity
      )
      true
    rescue ActiveRecord::RecordInvalid => e
      Rails.logger.warn("[Reminders::UpcomingNotifier] in_app reminder=#{@reminder.id}: #{e.message}")
      false
    end

    def minutes_until
      [((@reminder.remind_at - Time.current) / 60).ceil, 1].max
    end
  end
end
