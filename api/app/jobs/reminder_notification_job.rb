# frozen_string_literal: true

# ============================================================================
# ReminderNotificationJob — procesa recordatorios vencidos (batch cada minuto).
# ============================================================================
class ReminderNotificationJob < ApplicationJob
  queue_as :critical

  BATCH_SIZE = 100

  def perform
    ActsAsTenant.without_tenant do
      Reminder.due.find_each(batch_size: BATCH_SIZE) do |reminder|
        ActsAsTenant.with_tenant(reminder.tenant) do
          Reminders::DueDispatcher.call(reminder: reminder)
        end
      end
    end
  end
end
