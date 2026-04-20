# frozen_string_literal: true

# ============================================================================
# contacts — personas y empresas prospecto
# ----------------------------------------------------------------------------
# `phone_normalized` se calcula desde `phone_e164` con phonelib y se indexa
# con pg_trgm para detección de duplicados con tolerancia (typos, espacios).
# Email también se indexa lowercased para igualdad case-insensitive rápida.
# ============================================================================
class CreateContacts < ActiveRecord::Migration[8.1]
  def change
    create_table :contacts do |t|
      t.references :tenant,     null: false, foreign_key: true, index: true
      t.references :owner_user, foreign_key: { to_table: :users }, index: true

      t.string :kind,         null: false, default: "person", comment: "person | company"
      t.string :first_name
      t.string :last_name
      t.string :company_name
      t.string :job_title
      t.string :email
      t.string :phone_e164,                                 comment: "Formato E.164 (+57…)"
      t.string :phone_normalized,                           comment: "Solo dígitos para matching"
      t.string :document_id,                                comment: "Cédula / NIT"
      t.string :address
      t.string :city
      t.string :country, default: "CO"
      t.text   :notes
      t.jsonb  :custom_fields, null: false, default: {}, comment: "Campos extra por tenant"
      t.datetime :discarded_at, comment: "Soft-delete"

      t.timestamps
    end

    # Índices estándar
    add_index :contacts, [:tenant_id, :email]
    add_index :contacts, [:tenant_id, :phone_e164]
    add_index :contacts, [:tenant_id, :document_id]
    add_index :contacts, [:tenant_id, :owner_user_id]
    add_index :contacts, :discarded_at

    # Índices para detección de duplicados (búsquedas case-insensitive y trigram)
    execute <<~SQL
      CREATE INDEX index_contacts_on_lower_email
        ON contacts (tenant_id, LOWER(email))
        WHERE email IS NOT NULL AND discarded_at IS NULL;
    SQL

    execute <<~SQL
      CREATE INDEX index_contacts_on_phone_normalized_trgm
        ON contacts USING gin (phone_normalized gin_trgm_ops)
        WHERE phone_normalized IS NOT NULL AND discarded_at IS NULL;
    SQL

    execute <<~SQL
      CREATE INDEX index_contacts_on_full_name_trgm
        ON contacts USING gin ((COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) gin_trgm_ops);
    SQL
  end
end
