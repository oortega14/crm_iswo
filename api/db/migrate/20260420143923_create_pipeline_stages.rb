# frozen_string_literal: true

# ============================================================================
# pipeline_stages — etapas ordenadas dentro de un pipeline
# ----------------------------------------------------------------------------
# `position` define el orden visual en el Kanban.
# `closed_won` / `closed_lost` indican etapas terminales (no permite avanzar).
# `probability` es opcional, usado para forecasting.
# ============================================================================
class CreatePipelineStages < ActiveRecord::Migration[8.1]
  def change
    create_table :pipeline_stages do |t|
      t.references :tenant,   null: false, foreign_key: true, index: true
      t.references :pipeline, null: false, foreign_key: true, index: true

      t.string  :name,         null: false
      t.integer :position,     null: false, default: 0
      t.integer :probability,  null: false, default: 0, comment: "0-100"
      t.boolean :closed_won,   null: false, default: false
      t.boolean :closed_lost,  null: false, default: false
      t.string  :color,                     default: "#94A3B8"
      t.datetime :discarded_at, comment: "Soft-delete"

      t.timestamps
    end

    add_index :pipeline_stages, [:pipeline_id, :name],     unique: true
    add_index :pipeline_stages, [:pipeline_id, :position]
    add_check_constraint :pipeline_stages,
                         "probability >= 0 AND probability <= 100",
                         name: "pipeline_stages_probability_range"
  end
end
