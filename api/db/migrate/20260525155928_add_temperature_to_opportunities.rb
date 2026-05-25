# frozen_string_literal: true

class AddTemperatureToOpportunities < ActiveRecord::Migration[8.1]
  def change
    add_column :opportunities, :temperature, :string, default: "cold", null: false,
               comment: "cold | warm | hot — indicador rápido de interés del lead"
    add_index  :opportunities, :temperature
  end
end
