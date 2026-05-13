# frozen_string_literal: true

class AddFileSizeAndTimestampsToExports < ActiveRecord::Migration[8.1]
  def change
    add_column :exports, :file_size, :bigint
    add_column :exports, :started_at, :datetime
    add_column :exports, :finished_at, :datetime
  end
end
