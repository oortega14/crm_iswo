# frozen_string_literal: true

# ============================================================================
# tenants — raíz multi-tenant
# ----------------------------------------------------------------------------
# Cada negocio/vertical (ISWO, Mi Casita, Libranzas, …) es un tenant.
# Resolución por subdominio: <slug>.crm.iswo.com.co.
# ============================================================================
class CreateTenants < ActiveRecord::Migration[8.1]
  def change
    create_table :tenants do |t|
      t.string  :name,        null: false, comment: "Nombre comercial del tenant"
      t.string  :slug,        null: false, comment: "Subdominio único (ej. micasita)"
      t.string  :legal_name,               comment: "Razón social"
      t.string  :tax_id,                   comment: "NIT / RUT"
      t.string  :logo_url
      t.string  :primary_color,             default: "#0F172A"
      t.string  :timezone,    null: false,  default: "America/Bogota"
      t.string  :locale,      null: false,  default: "es-CO"
      t.string  :currency,    null: false,  default: "COP"
      t.jsonb   :settings,    null: false,  default: {}, comment: "Feature flags y config por tenant"
      t.boolean :active,      null: false,  default: true
      t.datetime :discarded_at, comment: "Soft-delete"

      t.timestamps
    end

    add_index :tenants, :slug,         unique: true
    add_index :tenants, :tax_id,       unique: true, where: "tax_id IS NOT NULL"
    add_index :tenants, :active
    add_index :tenants, :discarded_at
  end
end
