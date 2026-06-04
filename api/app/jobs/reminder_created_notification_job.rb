# frozen_string_literal: true

# Confirmación por correo + campana tras crear un recordatorio.
class ReminderCreatedNotificationJob < ApplicationJob
  queue_as :default

  def perform(reminder_id)
    reminder = ActsAsTenant.without_tenant { Reminder.find_by(id: reminder_id) }
    return if reminder.nil? || reminder.status_done?

    ActsAsTenant.with_tenant(reminder.tenant) do
      Reminders::CreatedNotifier.call(reminder: reminder)
    end
  end
end
