# frozen_string_literal: true

# ============================================================================
# pipelines — embudos comerciales configurables
# ----------------------------------------------------------------------------
# Cada tenant puede tener varios embudos (ej. "Ventas Mi Casita", "Renovaciones
# Libranzas"). Uno marcado como `is_default` es el usado para nuevos leads.
# ============================================================================
class CreatePipelines < ActiveRecord::Migration[8.1]
  def change
    create_table :pipelines do |t|
      t.references :tenant, null: false, foreign_key: true, index: true

      t.string  :name,         null: false
      t.string  :description
      t.boolean :is_default,   null: false, default: false
      t.boolean :active,       null: false, default: true
      t.integer :position,     null: false, default: 0
      t.datetime :discarded_at, comment: "Soft-delete"

      t.timestamps
    end

    add_index :pipelines, [:tenant_id, :name], unique: true
    add_index :pipelines, [:tenant_id, :is_default],
              unique: true,
              where: "is_default = true",
              name: "index_pipelines_one_default_per_tenant"
    add_index :pipelines, :discarded_at
  end
end
