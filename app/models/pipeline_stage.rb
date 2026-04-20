# frozen_string_literal: true

# ============================================================================
# PipelineStage — etapa ordenada dentro de un Pipeline
# ============================================================================
class PipelineStage < ApplicationRecord
  include TenantScoped

  # ---- Asociaciones ---------------------------------------------------------
  belongs_to :tenant
  belongs_to :pipeline
  has_many :opportunities, dependent: :restrict_with_exception

  # ---- Validaciones ---------------------------------------------------------
  validates :name, presence: true, uniqueness: { scope: :pipeline_id, case_sensitive: false }
  validates :position, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :probability, numericality: { only_integer: true,
                                          greater_than_or_equal_to: 0,
                                          less_than_or_equal_to: 100 }
  validate :terminal_states_mutually_exclusive

  # ---- Scopes ---------------------------------------------------------------
  scope :ordered,     -> { order(:position) }
  scope :open_stages, -> { where(closed_won: false, closed_lost: false) }
  scope :terminal,    -> { where("closed_won = TRUE OR closed_lost = TRUE") }

  def terminal?
    closed_won? || closed_lost?
  end

  private

  def terminal_states_mutually_exclusive
    errors.add(:base, "una etapa no puede ser closed_won y closed_lost a la vez") if closed_won? && closed_lost?
  end
end
