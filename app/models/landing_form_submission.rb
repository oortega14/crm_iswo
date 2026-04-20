# frozen_string_literal: true

# ============================================================================
# LandingFormSubmission — envío del formulario de una landing page
# ============================================================================
# El payload completo se guarda para preservar campos custom sin migración.
# El service LandingSubmissionProcessor genera Contact + Opportunity.
# ============================================================================
class LandingFormSubmission < ApplicationRecord
  include TenantScoped

  belongs_to :tenant
  belongs_to :landing_page
  belongs_to :contact, optional: true
  belongs_to :opportunity, optional: true

  validates :payload, presence: true

  scope :recent, -> { order(created_at: :desc) }
  scope :with_utm, -> { where.not(utm_source: [nil, ""]) }
end
