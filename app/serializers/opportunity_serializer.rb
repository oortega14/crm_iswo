# frozen_string_literal: true

# ============================================================================
# OpportunitySerializer — la entidad central del CRM.
# ============================================================================
# El SPA usa dos variantes:
#   - lista: sin relationships expandidas (solo ids), para el board kanban.
#   - detalle: incluye contact, owner, stage, logs, reminders (via `include:`).
# ============================================================================
class OpportunitySerializer < ApplicationSerializer
  set_type :opportunity

  attributes :title, :status, :estimated_value, :bant_score, :bant_data,
             :expected_close_date, :closed_at, :lost_reason, :notes,
             :last_activity_at, :custom_fields, :discarded_at

  attribute :stage_name do |o|
    o.pipeline_stage&.name
  end

  attribute :stage_position do |o|
    o.pipeline_stage&.position
  end

  attribute :probability do |o|
    o.pipeline_stage&.probability
  end

  attribute :age_in_days do |o|
    ((Time.current - o.created_at) / 1.day).floor
  end

  attribute :days_since_activity do |o|
    next nil unless o.last_activity_at

    ((Time.current - o.last_activity_at) / 1.day).floor
  end

  belongs_to :contact,        serializer: :contact
  belongs_to :pipeline,       serializer: :pipeline
  belongs_to :pipeline_stage, serializer: :pipeline_stage
  belongs_to :owner_user,     serializer: :user, record_type: :user
  belongs_to :lead_source,    serializer: :lead_source

  has_many :reminders,         serializer: :reminder
  has_many :opportunity_logs,  serializer: :opportunity_log
end
