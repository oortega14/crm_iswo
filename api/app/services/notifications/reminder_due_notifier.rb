# frozen_string_literal: true

module Notifications
  # Crea notificación in-app cuando un recordatorio vence (campana del SPA).
  class ReminderDueNotifier
    def self.call(reminder:)
      new(reminder: reminder).call
    end

    def initialize(reminder:)
      @reminder = reminder
    end

    # @return [Boolean] true si se creó la notificación; false si faltaba oportunidad/usuario
    def call
      opportunity = @reminder.opportunity
      user        = @reminder.user
      return false if opportunity.nil? || user.nil?

      Notification.create!(
        tenant:   @reminder.tenant,
        user:     user,
        kind:     "reminder_due",
        title:    @reminder.subject.presence || "Recordatorio vencido",
        body:     build_body(opportunity),
        resource: opportunity
      )
      true
    rescue ActiveRecord::RecordInvalid => e
      Rails.logger.warn(
        "[Notification] reminder_due reminder=#{@reminder.id}: #{e.message}"
      )
      false
    end

    private

    def build_body(opportunity)
      Reminders::MessageComposer.for(@reminder).due_in_app(channel: @reminder.channel)
    end
  end
end
