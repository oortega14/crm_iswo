# frozen_string_literal: true

namespace :reminders do
  desc "Procesa recordatorios vencidos (mismo job que Solid Queue cada minuto)"
  task notify_due: :environment do
    ReminderNotificationJob.perform_now
    puts "Recordatorios vencidos procesados."
  end

  desc "Envía avisos previos por vencer (mismo job que Solid Queue cada minuto)"
  task notify_upcoming: :environment do
    ReminderUpcomingNotificationJob.perform_now
    puts "Avisos previos de recordatorios procesados."
  end
end
