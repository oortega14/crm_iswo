# frozen_string_literal: true

# ============================================================================
# OpportunityLog — audit log específico de cada Opportunity
# ============================================================================
# Se alimenta desde callbacks del modelo Opportunity y desde controllers
# cuando se ejecutan acciones especiales (export, merge, reassign, note).
# ============================================================================
class OpportunityLog < ApplicationRecord
  include TenantScoped

  ACTIONS = %w[create update stage_change assign merge export note].freeze
  enum :action, ACTIONS.zip(ACTIONS).to_h, prefix: :action

  belongs_to :tenant
  belongs_to :opportunity
  belongs_to :user, optional: true

  validates :action, inclusion: { in: ACTIONS }

  scope :recent, -> { order(created_at: :desc) }
end
