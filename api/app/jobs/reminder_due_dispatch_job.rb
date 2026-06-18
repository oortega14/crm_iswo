# frozen_string_literal: true

# Dispara la entrega de un recordatorio concreto en remind_at (complementa el batch cada minuto).
class ReminderDueDispatchJob < ApplicationJob
  queue_as :critical

  def perform(reminder_id)
    reminder = ActsAsTenant.without_tenant { Reminder.find_by(id: reminder_id) }
    return if reminder.nil?
    return unless reminder.status_pending?
    return if reminder.remind_at.blank? || reminder.remind_at > Time.current

    ActsAsTenant.with_tenant(reminder.tenant) do
      Reminders::DueDispatcher.call(reminder: reminder)
    end
  end
end
