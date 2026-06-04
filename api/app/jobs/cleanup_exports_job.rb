# frozen_string_literal: true

# ============================================================================
# CleanupExportsJob — limpia exports vencidos.
# ============================================================================
# Programado diariamente (sidekiq-scheduler). Marca como expired y borra
# archivos locales cifrados / objetos S3 de exports con expires_at < now.
#
# No borra el registro (lo mantiene para auditoría ISO); solo invalida el
# file_url y libera storage.
# ============================================================================
class CleanupExportsJob < ApplicationJob
  queue_as :low

  def perform
    ActsAsTenant.without_tenant do
      Export.where(status: "succeeded")
            .where("expires_at < ?", Time.current)
            .find_each do |export|
        ActsAsTenant.with_tenant(export.tenant) { expire!(export) }
      rescue StandardError => e
        Rails.logger.error("[CleanupExportsJob] export=#{export.id} #{e.class}: #{e.message}")
      end
    end
  end

  private

  def expire!(export)
    Exports::Storage.delete!(export)
    export.update!(status: "expired", file_url: nil)
  end
end
