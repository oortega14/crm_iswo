# frozen_string_literal: true

# ============================================================================
# WhatsappDeliveryJob — envía un WhatsappMessage outbound al proveedor.
# ============================================================================
# Wrapper sobre WhatsApp::MessageSender. Se encola desde:
#   - WhatsappMessagesController#create
#   - ReminderNotificationJob (cuando channel="whatsapp")
#
# Usa cola "integrations" para no saturar la default.
# Reintenta hasta 5 veces con backoff polinomial; al fallar definitivamente
# marca el mensaje como failed (ya lo hace el sender).
# ============================================================================
class WhatsappDeliveryJob < ApplicationJob
  queue_as :integrations

  retry_on Faraday::Error, wait: :polynomially_longer, attempts: 5

  # Single-job uniqueness por message_id (evita doble envío en reintentos
  # duplicados de Sidekiq).
  def perform(message_id)
    msg = WhatsappMessage.find_by(id: message_id)
    return unless msg
    return if msg.status.in?(%w[sent delivered read])

    ActsAsTenant.with_tenant(msg.tenant) do
      WhatsApp::MessageSender.new(msg).deliver
    end
  end
end
