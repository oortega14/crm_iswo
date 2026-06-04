# frozen_string_literal: true

# Aviso previo (correo + campana) para recordatorios pendientes próximos a vencer.
class ReminderUpcomingNotificationJob < ApplicationJob
  queue_as :critical

  BATCH_SIZE = 100

  def perform
    ActsAsTenant.without_tenant do
      Reminder.due_for_upcoming_notice.find_each(batch_size: BATCH_SIZE) do |reminder|
        ActsAsTenant.with_tenant(reminder.tenant) do
          Reminders::UpcomingNotifier.call(reminder: reminder)
        end
      rescue StandardError => e
        Rails.logger.error(
          "[ReminderUpcomingNotificationJob] reminder=#{reminder.id} #{e.class}: #{e.message}"
        )
      end
    end
  end
end
