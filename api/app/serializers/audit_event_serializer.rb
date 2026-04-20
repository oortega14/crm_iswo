# frozen_string_literal: true

# ============================================================================
# AuditEventSerializer — bitácora ISO 27001 (no-repudio).
# ============================================================================
# Inmutable. El SPA solo lo muestra; nunca lo modifica.
# ============================================================================
class AuditEventSerializer < ApplicationSerializer
  set_type :audit_event

  attributes :action, :auditable_type, :auditable_id,
             :changes_data, :ip_address, :user_agent

  attribute :actor do |e|
    if e.user
      {
        id:    e.user.id,
        name:  [e.user.first_name, e.user.last_name].compact.join(" "),
        email: e.user.email,
        role:  e.user.role
      }
    else
      { id: nil, name: "sistema", email: nil, role: nil }
    end
  end

  belongs_to :tenant, serializer: :tenant
end
