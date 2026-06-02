# frozen_string_literal: true

namespace :reminders do
  desc "Procesa recordatorios vencidos (mismo job que Sidekiq cada minuto)"
  task notify_due: :environment do
    ReminderNotificationJob.perform_now
    puts "Recordatorios vencidos procesados."
  end
end
