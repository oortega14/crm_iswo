# frozen_string_literal: true

module Reminders
  # Correo de confirmación + campana al crear un recordatorio (cualquier canal).
  class CreatedNotifier
    def self.call(reminder:)
      new(reminder: reminder).call
    end

    def initialize(reminder:)
      @reminder = reminder
    end

    def call
      deliver_email!
      notify_in_app!
      true
    rescue StandardError => e
      Rails.logger.warn("[Reminders::CreatedNotifier] reminder=#{@reminder.id}: #{e.message}")
      false
    end

    private

    def deliver_email!
      return false if @reminder.user&.email.blank?
      return false unless defined?(ReminderMailer)

      ReminderMailer.with(reminder: @reminder).created_confirmation.deliver_now
      true
    end

    def notify_in_app!
      return false if @reminder.opportunity.nil?

      Notification.create!(
        tenant:   @reminder.tenant,
        user:     @reminder.user,
        kind:     "reminder_created",
        title:    "Recordatorio programado",
        body:     in_app_body,
        resource: @reminder.opportunity
      )
      true
    rescue ActiveRecord::RecordInvalid => e
      Rails.logger.warn("[Reminders::CreatedNotifier] in_app reminder=#{@reminder.id}: #{e.message}")
      false
    end

    def in_app_body
      at = I18n.l(@reminder.remind_at, format: :short) rescue @reminder.remind_at.to_s
      "«#{@reminder.subject}» — #{at}"
    end
  end
end
