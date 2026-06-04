# frozen_string_literal: true

# ============================================================================
# AuditLogger — punto único para persistir AuditEvent (ISO A.8.16)
# ============================================================================
module AuditLogger
  module_function

  def record!(tenant:, user:, action:, entity_type:, entity_id: nil, metadata: {}, ip_address: nil, user_agent: nil)
    AuditEvent.create!(
      tenant:      tenant,
      user:        user,
      action:      action,
      entity_type: entity_type,
      entity_id:   entity_id,
      ip_address:  ip_address,
      user_agent:  user_agent&.to_s&.truncate(255),
      metadata:    LogSanitizer.redact(metadata.deep_stringify_keys)
    )
  rescue StandardError => e
    Rails.logger.warn(
      "[AuditLogger] #{action} #{entity_type}##{entity_id}: #{e.message}"
    )
    nil
  end

  def record_entity!(tenant:, user:, action:, entity:, metadata: {}, ip_address: nil, user_agent: nil)
    record!(
      tenant:       tenant,
      user:         user,
      action:       action,
      entity_type:  entity.class.name,
      entity_id:    entity.id,
      metadata:     metadata,
      ip_address:   ip_address,
      user_agent:     user_agent
    )
  end
end
