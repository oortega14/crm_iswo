# frozen_string_literal: true

class AddProcessingStatusCommentToReminders < ActiveRecord::Migration[8.1]
  def change
    change_column_comment :reminders, :status,
                           from: "pending | sent | failed | done",
                           to: "pending | processing | sent | failed | done"
  end
end
