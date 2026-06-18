# frozen_string_literal: true

module Reminders
  # Programa la entrega al vencer (ActiveJob wait_until — funciona en dev sin Sidekiq).
  class DueSchedule
    def self.enqueue!(reminder)
      new(reminder).enqueue!
    end

    def initialize(reminder)
      @reminder = reminder
    end

    def enqueue!
      return unless @reminder.status_pending?
      return unless @reminder.remind_at.present?
      return unless StaffRecipient.eligible?(@reminder.user)

      run_at = [@reminder.remind_at, Time.current].max
      ReminderDueDispatchJob.set(wait_until: run_at).perform_later(@reminder.id)
    end
  end
end
