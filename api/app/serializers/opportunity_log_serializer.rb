# frozen_string_literal: true

# ============================================================================
# OpportunityLogSerializer — bitácora inmutable de una oportunidad.
# ============================================================================
class OpportunityLogSerializer < ApplicationSerializer
  set_type :opportunity_log

  attributes :action, :changes_data, :note, :ip_address, :user_agent

  # opportunity_logs no tiene columna updated_at (es inmutable)
  attribute :updated_at do |_log|
    nil
  end

  attribute :author_name do |log|
    log.user ? (log.user.name.presence || log.user.email) : "sistema"
  end

  belongs_to :user,        serializer: :user, record_type: :user
  belongs_to :opportunity, serializer: :opportunity
end
