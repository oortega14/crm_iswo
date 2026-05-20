# frozen_string_literal: true

class MakeOpportunityLogOpportunityOptional < ActiveRecord::Migration[8.1]
  def change
    change_column_null :opportunity_logs, :opportunity_id, true
  end
end
