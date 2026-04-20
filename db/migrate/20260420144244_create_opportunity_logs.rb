# frozen_string_literal: true

# ============================================================================
# opportunity_logs — audit log específico de oportunidades
# ----------------------------------------------------------------------------
# Se crea automáticamente desde callbacks del modelo Opportunity para cumplir
# el criterio del RFC: "100% de operaciones de creación, edición y eliminación".
# El JSON `changes` guarda el antes/después de cada campo modificado.
# ============================================================================
class CreateOpportunityLogs < ActiveRecord::Migration[8.1]
  def change
    create_table :opportunity_logs do |t|
      t.references :tenant,      null: false, foreign_key: true, index: true
      t.references :opportunity, null: false, foreign_key: true, index: true
      t.references :user,        foreign_key: true, index: true, comment: "Autor del cambio"

      t.string :action, null: false,
               comment: "create | update | stage_change | assign | merge | export | note"
      t.jsonb  :changes_data, null: false, default: {},
               comment: "Diff de atributos; `changes` está reservado en AR"
      t.text   :note
      t.string :ip_address
      t.string :user_agent

      t.datetime :created_at, null: false
    end

    add_index :opportunity_logs, [:tenant_id, :created_at]
    add_index :opportunity_logs, [:opportunity_id, :created_at]
    add_index :opportunity_logs, :action
  end
end
