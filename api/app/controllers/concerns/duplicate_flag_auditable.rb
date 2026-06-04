# frozen_string_literal: true

# ============================================================================
# DuplicateFlagAuditable — trazabilidad RFC §6.2 en audit_events.
# ============================================================================
module DuplicateFlagAuditable
  extend ActiveSupport::Concern

  private

  def audit_duplicate_scan!(scanned:, created:)
    AuditLogger.record!(
      tenant:       current_tenant,
      user:         current_user,
      action:       "duplicate.scan",
      entity_type:  "DuplicateFlag",
      metadata:     { scanned: scanned, created: created },
      ip_address:   request.remote_ip,
      user_agent:   request.user_agent
    )
  end

  def audit_duplicate_flag!(action, flag, extra = {})
    AuditLogger.record!(
      tenant:       current_tenant,
      user:         current_user,
      action:       action,
      entity_type:  "DuplicateFlag",
      entity_id:    flag.id,
      metadata:     {
        opportunity_id:              flag.opportunity_id,
        duplicate_of_opportunity_id: flag.duplicate_of_opportunity_id,
        resolution:                  flag.resolution
      }.merge(extra),
      ip_address:   request.remote_ip,
      user_agent:   request.user_agent
    )
  end
end
