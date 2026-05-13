# frozen_string_literal: true

# ============================================================================
# WebhookEnqueue — encola WebhookProcessorJob sin tumbar la respuesta HTTP.
# ============================================================================
# Si Redis/Sidekiq falla al encolar, los proveedores (Meta, Google, Twilio)
# reciben igualmente 200 OK para no reintentos infinitos; el fallo queda en log.
# ============================================================================
module WebhookEnqueue
  extend ActiveSupport::Concern

  private

  def enqueue_webhook_processor(kind, payload)
    return unless defined?(WebhookProcessorJob)

    WebhookProcessorJob.perform_later(kind, payload)
  rescue StandardError => e
    Rails.logger.error(
      "[WebhookProcessorJob] Encolado fallido kind=#{kind}: #{e.class}: #{e.message}"
    )
  end
end
