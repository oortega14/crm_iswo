# frozen_string_literal: true

# ============================================================================
# lead_sources — orígenes configurables por tenant
# ----------------------------------------------------------------------------
# Permite distinguir "Meta Ads - Campaña Black Friday" de "Meta Ads - Orgánico"
# manteniendo el `kind` para agregaciones globales.
# ============================================================================
class CreateLeadSources < ActiveRecord::Migration[8.1]
  def change
    create_table :lead_sources do |t|
      t.references :tenant, null: false, foreign_key: true, index: true

      t.string  :name,    null: false, comment: "Etiqueta visible al consultor"
      t.string  :kind,    null: false, comment: "web|whatsapp|meta|google|manual|referral"
      t.jsonb   :config,  null: false, default: {}, comment: "Parámetros (ej. campaign_id)"
      t.boolean :active,  null: false, default: true

      t.timestamps
    end

    add_index :lead_sources, [:tenant_id, :name], unique: true
    add_index :lead_sources, [:tenant_id, :kind]
  end
end
