# frozen_string_literal: true

# ============================================================================
# LandingFormSubmission — envío del formulario de una landing page
# ============================================================================
# El payload completo se guarda para preservar campos custom sin migración.
# El service LandingSubmissionProcessor genera Contact + Opportunity.
# ============================================================================
class LandingFormSubmission < ApplicationRecord
  include TenantScoped
  include DataClassifiable

  # Limita el tamaño del payload: el endpoint público (sin auth) permite
  # cualquier estructura vía `permit!` para soportar campos custom de
  # landings sin migración — este tope evita abuso (payloads gigantes/
  # anidados) contra el jsonb de esta tabla y de `opportunities.custom_fields`.
  MAX_PAYLOAD_BYTES = 20.kilobytes

  belongs_to :tenant
  belongs_to :landing_page
  belongs_to :contact, optional: true
  belongs_to :opportunity, optional: true

  validates :payload, presence: true
  validate :payload_within_size_limit

  scope :recent, -> { order(created_at: :desc) }
  scope :with_utm, -> { where.not(utm_source: [nil, ""]) }

  private

  def payload_within_size_limit
    return if payload.blank?

    size = payload.to_json.bytesize
    return if size <= MAX_PAYLOAD_BYTES

    errors.add(:payload, "es demasiado grande (máx #{MAX_PAYLOAD_BYTES / 1.kilobyte} KB)")
  end
end
