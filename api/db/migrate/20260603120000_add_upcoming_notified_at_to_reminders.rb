# frozen_string_literal: true

class AddUpcomingNotifiedAtToReminders < ActiveRecord::Migration[8.1]
  def change
    add_column :reminders, :upcoming_notified_at, :datetime,
               comment: "Aviso previo por correo/in-app antes de remind_at"
    add_index :reminders, [:status, :remind_at, :upcoming_notified_at],
              name: "index_reminders_upcoming_dispatch"
  end
end
