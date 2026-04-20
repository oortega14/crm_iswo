# frozen_string_literal: true

# ============================================================================
# AuditEvent — audit log global fuera del dominio de Opportunity
# ============================================================================
# Eventos como login/logout, cambios de rol, activación de tenant,
# conexión de integraciones. No lleva acts_as_tenant porque algunos
# eventos son del super-admin global (tenant_id NULL).
# ============================================================================
class AuditEvent < ApplicationRecord
  # Acciones no se encierran en un enum estricto para permitir extensibilidad.
  # Se recomienda usar constantes en servicios: AuthService::LOGIN, etc.

  belongs_to :tenant, optional: true
  belongs_to :user,   optional: true

  validates :action, presence: true

  scope :global, -> { where(tenant_id: nil) }
  scope :for_entity, ->(record) { where(entity_type: record.class.name, entity_id: record.id) }
  scope :recent, -> { order(created_at: :desc) }
end
