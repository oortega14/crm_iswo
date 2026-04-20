# frozen_string_literal: true

# ============================================================================
# duplicate_flags — colisiones detectadas entre oportunidades
# ----------------------------------------------------------------------------
# Cuando un consultor intenta registrar una oportunidad cuyo contacto ya
# existe (por teléfono o email), el servicio DuplicateDetector inserta un
# flag con la relación `opportunity_id -> duplicate_of_opportunity_id`.
# El admin resuelve: reasignar, fusionar o ignorar.
# ============================================================================
class CreateDuplicateFlags < ActiveRecord::Migration[8.1]
  def change
    create_table :duplicate_flags do |t|
      t.references :tenant,                    null: false, foreign_key: true, index: true
      t.references :opportunity,               null: false, foreign_key: true, index: true,
                   comment: "La oportunidad nueva/detectada como duplicada"
      t.references :duplicate_of_opportunity,  null: false, foreign_key: { to_table: :opportunities }, index: true,
                   comment: "La oportunidad existente (ganadora)"
      t.references :detected_by_user,          null: false, foreign_key: { to_table: :users }, index: true
      t.references :resolved_by_user,          foreign_key: { to_table: :users }, index: true

      t.string   :matched_on, null: false, comment: "phone | email | both"
      t.string   :resolution, null: false, default: "pending",
                              comment: "pending | reassigned | merged | ignored"
      t.text     :resolution_note
      t.decimal  :match_score, precision: 5, scale: 4,
                              comment: "Similaridad trigram (0.0 - 1.0)"
      t.datetime :resolved_at

      t.timestamps
    end

    add_index :duplicate_flags, [:tenant_id, :resolution]
    add_index :duplicate_flags, [:opportunity_id, :duplicate_of_opportunity_id],
              unique: true,
              name: "index_duplicate_flags_unique_pair"
  end
end
