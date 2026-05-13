class AddConsecutiveFailuresToAdIntegrations < ActiveRecord::Migration[8.1]
  def change
    add_column :ad_integrations, :consecutive_failures, :integer, default: 0, null: false
  end
end
