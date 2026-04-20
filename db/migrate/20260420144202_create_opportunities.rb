# frozen_string_literal: true

# ============================================================================
# opportunities — tabla central del dominio comercial
# ----------------------------------------------------------------------------
# `status` enum string: new_lead | contacted | qualified | proposal | won | lost
# `bant_score` 0-100 calculado por el servicio de scoring BANT.
# `last_activity_at` se actualiza con cualquier interacción (recordatorio,
# WhatsApp, cambio de etapa) — alimenta el indicador "sin actividad > N días".
# ============================================================================
class CreateOpportunities < ActiveRecord::Migration[8.1]
  def change
    create_table :opportunities do |t|
      t.references :tenant,         null: false, foreign_key: true, index: true
      t.references :contact,        null: false, foreign_key: true, index: true
      t.references :pipeline,       null: false, foreign_key: true, index: true
      t.references :pipeline_stage, null: false, foreign_key: true, index: true
      t.references :owner_user,     null: false, foreign_key: { to_table: :users }, index: true
      t.references :lead_source,                  foreign_key: true, index: true

      t.string  :title,            null: false
      t.text    :description
      t.decimal :estimated_value,   precision: 14, scale: 2, default: 0
      t.string  :currency,          null: false, default: "COP"
      t.integer :bant_score,        null: false, default: 0
      t.boolean :qualified,         null: false, default: false
      t.string  :status,            null: false, default: "new_lead",
                comment: "new_lead | contacted | qualified | proposal | won | lost"
      t.datetime :last_activity_at, null: false
      t.date    :expected_close_on
      t.datetime :closed_at,                   comment: "Cuándo entró a etapa terminal"
      t.string  :close_reason,                 comment: "Motivo de cierre/perdida"
      t.jsonb   :custom_fields,    null: false, default: {}, comment: "Campos extra por tenant"
      t.datetime :discarded_at, comment: "Soft-delete"

      t.timestamps
    end

    add_index :opportunities, [:tenant_id, :status]
    add_index :opportunities, [:tenant_id, :pipeline_stage_id]
    add_index :opportunities, [:tenant_id, :owner_user_id]
    add_index :opportunities, [:tenant_id, :last_activity_at]
    add_index :opportunities, :discarded_at

    add_check_constraint :opportunities,
                         "bant_score >= 0 AND bant_score <= 100",
                         name: "opportunities_bant_score_range"
    add_check_constraint :opportunities,
                         "estimated_value >= 0",
                         name: "opportunities_value_non_negative"
  end
end
