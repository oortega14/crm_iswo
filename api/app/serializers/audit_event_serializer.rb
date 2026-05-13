# frozen_string_literal: true

# ============================================================================
# AuditEventSerializer — bitácora ISO 27001 (no-repudio).
# ============================================================================
# Inmutable. El SPA solo lo muestra; nunca lo modifica.
# ============================================================================
class AuditEventSerializer < ApplicationSerializer
  set_type :audit_event

  attributes :action, :entity_type, :entity_id, :metadata, :ip_address, :user_agent, :tenant_id

  attribute :actor do |e|
    if e.user
      {
        id:    e.user.id,
        name:  e.user.name.to_s,
        email: e.user.email,
        role:  e.user.role
      }
    else
      { id: nil, name: "sistema", email: nil, role: nil }
    end
  end
end
