# frozen_string_literal: true

# ============================================================================
# CleanupExportsJob — limpia exports vencidos.
# ============================================================================
# Programado diariamente (sidekiq-scheduler). Marca como expired y borra
# archivos locales / objetos S3 de exports con expires_at < now.
#
# No borra el registro (lo mantiene para auditoría ISO); solo invalida el
# file_url y libera storage.
# ============================================================================
class CleanupExportsJob < ApplicationJob
  queue_as :low

  def perform
    ActsAsTenant.without_tenant do
      Export.where(status: "ready")
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
    delete_local_file(export)
    delete_s3_object(export)
    export.update!(status: "expired", file_url: nil)
  end

  def delete_local_file(export)
    path = Rails.root.join("public", "exports", export.tenant_id.to_s, "#{export.id}.#{export.format}")
    File.delete(path) if File.exist?(path)
  end

  def delete_s3_object(export)
    return unless ENV["AWS_S3_BUCKET"].present? && defined?(Aws::S3::Resource)

    key = "exports/#{export.tenant_id}/#{export.id}.#{export.format}"
    Aws::S3::Resource.new(region: ENV.fetch("AWS_REGION", "us-east-1"))
                     .bucket(ENV["AWS_S3_BUCKET"])
                     .object(key)
                     .delete
  end
end
