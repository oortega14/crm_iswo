# frozen_string_literal: true

# ============================================================================
# bant_criteria — pesos de calificación BANT por tenant
# ----------------------------------------------------------------------------
# BANT = Budget, Authority, Need, Timeline. Cada tenant define cuánto pesa
# cada dimensión y el umbral a partir del cual una oportunidad se considera
# "qualified". Los valores se aplican en el servicio de scoring.
# ============================================================================
class CreateBantCriteria < ActiveRecord::Migration[8.1]
  def change
    create_table :bant_criteria do |t|
      t.references :tenant, null: false, foreign_key: true, index: { unique: true }

      t.integer :budget_weight,      null: false, default: 25
      t.integer :authority_weight,   null: false, default: 25
      t.integer :need_weight,        null: false, default: 25
      t.integer :timeline_weight,    null: false, default: 25
      t.integer :threshold_qualified, null: false, default: 60,
                                       comment: "Score mínimo para considerar qualified"
      t.datetime :discarded_at, comment: "Soft-delete"

      t.timestamps
    end

    add_check_constraint :bant_criteria,
                         "budget_weight + authority_weight + need_weight + timeline_weight = 100",
                         name: "bant_weights_sum_100"
    add_check_constraint :bant_criteria,
                         "threshold_qualified >= 0 AND threshold_qualified <= 100",
                         name: "bant_threshold_range"
  end
end