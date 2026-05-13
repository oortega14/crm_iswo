# frozen_string_literal: true

class CreateNotifications < ActiveRecord::Migration[8.1]
  def change
    create_table :notifications do |t|
      t.references :tenant, null: false, foreign_key: true, index: true
      t.references :user,   null: false, foreign_key: true

      t.string  :kind,          null: false, default: "reminder_due"
      t.string  :title,         null: false
      t.text    :body
      t.string  :resource_type
      t.bigint  :resource_id
      t.datetime :read_at

      t.timestamps
    end

    add_index :notifications, [:user_id, :read_at]
    add_index :notifications, [:resource_type, :resource_id]
  end
end
