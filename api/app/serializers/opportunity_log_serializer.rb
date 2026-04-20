# frozen_string_literal: true

# ============================================================================
# OpportunityLogSerializer — bitácora inmutable de una oportunidad.
# ============================================================================
class OpportunityLogSerializer < ApplicationSerializer
  set_type :opportunity_log

  attributes :action, :changes_data, :note, :ip_address, :user_agent

  attribute :author_name do |log|
    if log.user
      [log.user.first_name, log.user.last_name].compact.join(" ").presence || log.user.email
    else
      "sistema"
    end
  end

  belongs_to :user,        serializer: :user, record_type: :user
  belongs_to :opportunity, serializer: :opportunity
end
