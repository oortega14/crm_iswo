# frozen_string_literal: true

# ============================================================================
# exports — registro auditado de exportaciones de datos
# ----------------------------------------------------------------------------
# Solo admin/manager pueden exportar (chequeado en ExportPolicy). El archivo
# se genera en ExportGenerationJob y sube a storage (S3). URL firmada con TTL
# para cumplir A.7.10 (medios de almacenamiento con control de acceso).
# ============================================================================
class CreateExports < ActiveRecord::Migration[8.1]
  def change
    create_table :exports do |t|
      t.references :tenant, null: false, foreign_key: true, index: true
      t.references :user,   null: false, foreign_key: true, index: true

      t.string   :resource, null: false, comment: "contacts | opportunities"
      t.string   :format,   null: false, comment: "csv | xlsx"
      t.jsonb    :filters,  null: false, default: {}
      t.string   :status,   null: false, default: "queued",
                            comment: "queued | running | succeeded | failed | expired"
      t.string   :file_url
      t.integer  :row_count
      t.datetime :expires_at
      t.text     :error_message

      t.timestamps
    end

    add_index :exports, [:tenant_id, :user_id, :created_at]
    add_index :exports, :status
    add_index :exports, :expires_at
  end
end
