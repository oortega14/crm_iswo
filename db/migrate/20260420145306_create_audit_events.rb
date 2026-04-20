# frozen_string_literal: true

# ============================================================================
# audit_events — audit log global fuera del dominio de oportunidad
# ----------------------------------------------------------------------------
# Complementa `opportunity_logs`. Registra: login/logout, cambios de rol,
# activación/suspensión de tenants, creación de integraciones, regeneración
# de tokens, etc. Cumple ISO 27001 A.8.16 para eventos de seguridad.
# ============================================================================
class CreateAuditEvents < ActiveRecord::Migration[8.1]
  def change
    create_table :audit_events do |t|
      t.references :tenant, foreign_key: true, index: true,
                            comment: "NULL para eventos globales (super-admin)"
      t.references :user,   foreign_key: true, index: true,
                            comment: "Actor del evento"

      t.string :entity_type,     comment: "Clase del recurso afectado"
      t.bigint :entity_id
      t.string :action, null: false,
                        comment: "login|logout|role_change|tenant_activate|integration_connect|…"
      t.jsonb  :metadata, null: false, default: {}
      t.string :ip_address
      t.string :user_agent

      t.datetime :created_at, null: false
    end

    add_index :audit_events, [:tenant_id, :created_at]
    add_index :audit_events, [:entity_type, :entity_id]
    add_index :audit_events, :action
  end
end
