# frozen_string_literal: true

# ============================================================================
# LeadSource — orígenes de lead configurables por tenant
# ============================================================================
class LeadSource < ApplicationRecord
  include TenantScoped

  KINDS = %w[web whatsapp meta google manual referral].freeze
  enum :kind, KINDS.zip(KINDS).to_h, prefix: true

  belongs_to :tenant
  has_many :opportunities, dependent: :nullify

  validates :name, presence: true, uniqueness: { scope: :tenant_id, case_sensitive: false }
  validates :kind, presence: true, inclusion: { in: KINDS }

  scope :active, -> { where(active: true) }
end
