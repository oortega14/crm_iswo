# frozen_string_literal: true

# ============================================================================
# AdSyncJob — testea conexión y sincroniza estado de las AdIntegrations.
# ============================================================================
# Programado cada 30 minutos (sidekiq-scheduler). Recorre todas las
# integraciones activas y:
#   1. Llama a Ads::ConnectionTester.
#   2. Si OK → record_sync! (actualiza last_synced_at).
#   3. Si falla → record_failure! y, tras 3 fallos consecutivos, pausa la
#      integración (status="paused") y notifica al admin del tenant.
# ============================================================================
class AdSyncJob < ApplicationJob
  queue_as :integrations

  MAX_CONSECUTIVE_FAILURES = 3

  def perform
    ActsAsTenant.without_tenant do
      AdIntegration.where(status: "active").find_each do |integration|
        ActsAsTenant.with_tenant(integration.tenant) { check(integration) }
      rescue StandardError => e
        Rails.logger.error("[AdSyncJob] integration=#{integration.id} #{e.class}: #{e.message}")
      end
    end
  end

  private

  def check(integration)
    if Ads::ConnectionTester.new(integration).call
      integration.record_sync!
    else
      integration.record_failure!("Test programado de conexión falló")
      pause_if_repeated_failures(integration)
    end
  end

  def pause_if_repeated_failures(integration)
    return unless integration.respond_to?(:consecutive_failures)
    return if integration.consecutive_failures.to_i < MAX_CONSECUTIVE_FAILURES

    integration.update!(status: "paused")

    if defined?(IntegrationMailer)
      admin = integration.tenant.users.find_by(role: "admin")
      IntegrationMailer.with(integration: integration, user: admin).paused.deliver_later if admin
    end
  end
end
