# frozen_string_literal: true

# ===========================================================================
# Tabla de definición de campos extra por tenant (F5 — Verticales).
# Cada fila define un campo que aparecerá en la oportunidad o contacto
# de ese tenant (ej. "Empleador", "Tipo de libranza" para el tenant Libranzas).
#
# Los valores se almacenan en la columna JSONB `custom_fields` ya existente
# en `opportunities` y `contacts`.
# ===========================================================================
class CreateTenantFieldDefinitions < ActiveRecord::Migration[8.0]
  def change
    create_table :tenant_field_definitions, id: :uuid, default: -> { "gen_random_uuid()" } do |t|
      t.references :tenant, null: false, foreign_key: true

      t.string  :key,        null: false, comment: "Clave interna, e.g. 'empleador_nit'"
      t.string  :label,      null: false, comment: "Etiqueta visible al usuario"
      t.string  :field_type, null: false, default: "text",
                comment: "text | number | select | date | boolean | currency"
      t.jsonb   :options,    null: false, default: [],
                comment: "Opciones para tipo 'select', ej. ['Sector público','Privado']"
      t.boolean :required,   null: false, default: false
      t.string  :entity,     null: false, default: "opportunity",
                comment: "Entidad destino: 'opportunity' | 'contact'"
      t.integer :position,   null: false, default: 0
      t.boolean :active,     null: false, default: true

      t.timestamps
    end

    add_index :tenant_field_definitions, %i[tenant_id key entity], unique: true,
              name: "idx_tenant_field_defs_unique_key"
    add_index :tenant_field_definitions, %i[tenant_id entity position],
              name: "idx_tenant_field_defs_order"

    add_check_constraint :tenant_field_definitions,
                         "field_type IN ('text','number','select','date','boolean','currency')",
                         name: "chk_tenant_field_def_type"
    add_check_constraint :tenant_field_definitions,
                         "entity IN ('opportunity','contact')",
                         name: "chk_tenant_field_def_entity"
  end
end
