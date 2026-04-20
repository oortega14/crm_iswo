# frozen_string_literal: true

# ============================================================================
# Opportunity — tabla central del dominio comercial
# ============================================================================
# Ciclo de vida (status):
#   new_lead → contacted → qualified → proposal → won | lost
#
# `last_activity_at` se toca desde:
#   - creación de notas / logs
#   - cambios de etapa
#   - mensajes WhatsApp
#   - recordatorios marcados como done
# ============================================================================
class Opportunity < ApplicationRecord
  include TenantScoped
  include Discard::Model

  STATUSES = {
    "new_lead"  => "new_lead",
    "contacted" => "contacted",
    "qualified" => "qualified",
    "proposal"  => "proposal",
    "won"       => "won",
    "lost"      => "lost"
  }.freeze
  enum :status, STATUSES, prefix: true, default: "new_lead"

  # ---- Asociaciones ---------------------------------------------------------
  belongs_to :tenant
  belongs_to :contact
  belongs_to :pipeline
  belongs_to :pipeline_stage
  belongs_to :owner_user,  class_name: "User"
  belongs_to :lead_source, optional: true

  has_many :opportunity_logs, dependent: :destroy
  has_many :reminders,        dependent: :destroy
  has_many :whatsapp_messages, dependent: :nullify
  has_many :duplicate_flags,  dependent: :destroy
  has_many :landing_form_submissions, dependent: :nullify

  # Duplicados donde ESTA oportunidad es la "ganadora"
  has_many :duplicate_flags_as_original,
           class_name: "DuplicateFlag",
           foreign_key: :duplicate_of_opportunity_id,
           dependent: :destroy

  # ---- Validaciones ---------------------------------------------------------
  validates :title, presence: true
  validates :estimated_value,
            numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :bant_score,
            numericality: { only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: 100 }
  validates :currency, length: { is: 3 }
  validate  :stage_belongs_to_pipeline

  # ---- Callbacks ------------------------------------------------------------
  before_validation :set_last_activity_at, on: :create
  before_save :track_close_transition

  # ---- Scopes ---------------------------------------------------------------
  scope :open,        -> { where.not(status: %w[won lost]) }
  scope :won,         -> { where(status: "won") }
  scope :lost,        -> { where(status: "lost") }
  scope :by_owner,    ->(user_id) { where(owner_user_id: user_id) }
  scope :stale,       ->(days = 7) { where(last_activity_at: ..days.days.ago) }

  # ---- Helpers --------------------------------------------------------------
  def terminal?
    status_won? || status_lost?
  end

  def touch_activity!
    update_column(:last_activity_at, Time.current)
  end

  private

  def set_last_activity_at
    self.last_activity_at ||= Time.current
  end

  def stage_belongs_to_pipeline
    return if pipeline_stage.blank? || pipeline.blank?

    errors.add(:pipeline_stage, "no pertenece al pipeline indicado") if pipeline_stage.pipeline_id != pipeline_id
  end

  def track_close_transition
    if status_changed? && terminal?
      self.closed_at ||= Time.current
    elsif status_changed? && !terminal?
      self.closed_at = nil
      self.close_reason = nil
    end
  end
end
