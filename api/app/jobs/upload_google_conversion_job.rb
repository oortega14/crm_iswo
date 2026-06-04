# frozen_string_literal: true

# ============================================================================
# UploadGoogleConversionJob — sube una conversión offline a Google Ads cuando
# una oportunidad pasa a estado "won".
# ============================================================================
# Solo actúa si:
#   1. La oportunidad tiene `custom_fields["gcl_id"]` (viene de clic de Google Ads).
#   2. El tenant tiene una AdIntegration de tipo "google" activa.
#
# Resultado registrado en opportunity_logs con action "google_conversion_upload".
# ============================================================================
class UploadGoogleConversionJob < ApplicationJob
  queue_as :integrations

  retry_on Faraday::Error, wait: :polynomially_longer, attempts: 4

  def perform(opportunity_id)
    ActsAsTenant.without_tenant do
      opportunity = Opportunity.kept.find_by(id: opportunity_id)
      return unless opportunity

      ActsAsTenant.with_tenant(opportunity.tenant) { process(opportunity) }
    end
  end

  private

  def process(opportunity)
    gclid = opportunity.custom_fields&.dig("gcl_id").to_s.strip
    if gclid.blank?
      Rails.logger.info("[UploadGoogleConversionJob] opp=#{opportunity.id} sin gcl_id, omitida")
      return
    end

    integration = opportunity.tenant.ad_integrations.find_by(provider: "google", status: "active")
    unless integration
      Rails.logger.info("[UploadGoogleConversionJob] opp=#{opportunity.id} sin integración Google activa")
      return
    end

    result = Ads::GoogleConversionUploader.new(
      integration:         integration,
      gclid:               gclid,
      conversion_datetime: opportunity.closed_at || Time.current,
      conversion_value:    opportunity.estimated_value.to_f,
      currency_code:       opportunity.currency
    ).call

    log_result(opportunity, result, integration)
  end

  def log_result(opportunity, result, integration)
    note = if result.success?
             "Conversión subida a Google Ads (integration_id=#{integration.id})"
           else
             errors = result.partial_errors.presence || [result.message]
             "Error al subir conversión a Google Ads: #{errors.join(' | ').truncate(400)}"
           end

    opportunity.opportunity_logs.create!(
      tenant:       opportunity.tenant,
      user:         nil,
      action:       "google_conversion_upload",
      note:         note,
      changes_data: {
        integration_id:   integration.id,
        gcl_id:           opportunity.custom_fields["gcl_id"],
        conversion_value: opportunity.estimated_value,
        currency:         opportunity.currency,
        success:          result.success?
      }
    )

    Rails.logger.warn("[UploadGoogleConversionJob] opp=#{opportunity.id} #{note}") unless result.success?
  end
end
