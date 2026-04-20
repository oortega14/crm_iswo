# frozen_string_literal: true

# ============================================================================
# ad_integrations — credenciales cifradas de canales externos
# ----------------------------------------------------------------------------
# `credentials_ciphertext` se cifra con Lockbox (AES-256-GCM). La llave maestra
# está en `LOCKBOX_MASTER_KEY`. Nunca loguear este campo.
# ============================================================================
class CreateAdIntegrations < ActiveRecord::Migration[8.1]
  def change
    create_table :ad_integrations do |t|
      t.references :tenant, null: false, foreign_key: true, index: true

      t.string   :provider,               null: false, comment: "meta | google | twilio | whatsapp_cloud"
      t.string   :account_identifier,                  comment: "ID público de la cuenta (ej. Meta Ad Account)"
      t.text     :credentials_ciphertext, null: false, comment: "Cifrado con Lockbox"
      t.string   :status,                 null: false, default: "active",
                                                        comment: "active | paused | error | revoked"
      t.datetime :last_sync_at
      t.datetime :last_error_at
      t.text     :last_error_message
      t.jsonb    :metadata, null: false, default: {}

      t.timestamps
    end

    add_index :ad_integrations, [:tenant_id, :provider], unique: true
    add_index :ad_integrations, :status
  end
end
