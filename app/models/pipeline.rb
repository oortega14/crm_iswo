# frozen_string_literal: true

# ============================================================================
# Pipeline — embudo comercial configurable por tenant
# ============================================================================
class Pipeline < ApplicationRecord
  include TenantScoped
  include Discard::Model

  # ---- Asociaciones ---------------------------------------------------------
  belongs_to :tenant
  has_many :pipeline_stages, -> { order(:position) }, dependent: :destroy
  has_many :opportunities, dependent: :restrict_with_exception

  # ---- Validaciones ---------------------------------------------------------
  validates :name, presence: true, uniqueness: { scope: :tenant_id, case_sensitive: false }

  validate :only_one_default_per_tenant

  # ---- Scopes ---------------------------------------------------------------
  scope :active,   -> { kept.where(active: true) }
  scope :default,  -> { where(is_default: true) }

  # ---- Helpers --------------------------------------------------------------
  def default_stage
    pipeline_stages.order(:position).first
  end

  def closed_won_stage
    pipeline_stages.find_by(closed_won: true)
  end

  def closed_lost_stage
    pipeline_stages.find_by(closed_lost: true)
  end

  private

  def only_one_default_per_tenant
    return unless is_default? && tenant_id.present?

    duplicate = Pipeline.where(tenant_id: tenant_id, is_default: true).where.not(id: id).exists?
    errors.add(:is_default, "ya existe un pipeline default para este tenant") if duplicate
  end
end
