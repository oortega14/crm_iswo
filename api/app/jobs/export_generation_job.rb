# frozen_string_literal: true

# ============================================================================
# ExportGenerationJob — genera el archivo asociado a un Export.
# ============================================================================
# Soporta resource = "contacts" | "opportunities" | "whatsapp_messages".
# Soporta format   = "xlsx" (caxlsx) | "csv".
#
# Flujo:
#   1. Marca el export como status="running" (enum Export).
#   2. Construye el scope respetando filters (Ransack-friendly hash).
#   3. Genera archivo en /tmp/exports/<tenant>/<export_id>.<format>.
#   4. Sube a S3 (si AWS_S3_BUCKET está seteado) o copia a public/exports/.
#   5. Setea file_url, expires_at = 7 días, status="succeeded".
#   6. Notifica al usuario (in_app o email).
# ============================================================================
class ExportGenerationJob < ApplicationJob
  queue_as :exports

  EXPIRY = 7.days

  def perform(export_id)
    export = Export.find_by(id: export_id)
    return unless export

    ActsAsTenant.with_tenant(export.tenant) do
      export.update!(status: "running", started_at: Time.current)

      path, row_count = case export.format
                        when "xlsx" then build_xlsx(export)
                        when "csv"  then build_csv(export)
                        else raise "Formato no soportado: #{export.format}"
                        end

      url = upload_or_persist(export, path)

      export.update!(
        status:      "succeeded",
        file_url:    url,
        file_size:   File.size(path),
        row_count:   row_count,
        expires_at:  EXPIRY.from_now,
        finished_at: Time.current
      )

      ExportMailer.with(export: export).ready.deliver_later if defined?(ExportMailer) && export.user&.email.present?
    end
  rescue StandardError => e
    Rails.logger.error("[ExportGenerationJob] export=#{export_id} #{e.class}: #{e.message}")
    export&.update(status: "failed", error_message: e.message.truncate(500), finished_at: Time.current)
    ExportMailer.with(export: export).failed.deliver_later if defined?(ExportMailer) && export&.user&.email.present?
  end

  # ===========================================================================

  private

  def build_xlsx(export)
    scope = collection(export)
    result = Exports::FileBuilder.build(
      scope:    scope,
      resource: export.resource,
      format:   "xlsx",
      basename: "#{export.resource}_#{export.id}"
    )
    dest = tmp_path(export, "xlsx")
    FileUtils.cp(result.path, dest)
    File.delete(result.path) if File.exist?(result.path)
    [dest, result.row_count]
  end

  def build_csv(export)
    scope = collection(export)
    result = Exports::FileBuilder.build(
      scope:    scope,
      resource: export.resource,
      format:   "csv",
      basename: "#{export.resource}_#{export.id}"
    )
    dest = tmp_path(export, "csv")
    FileUtils.cp(result.path, dest)
    File.delete(result.path) if File.exist?(result.path)
    [dest, result.row_count]
  end

  def collection(export)
    case export.resource
    when "contacts", "opportunities"
      Exports::ScopedCollection.new(
        user:     export.user,
        resource: export.resource,
        filters:  export.filters || {}
      ).resolve
    when "whatsapp_messages"
      base = WhatsappMessage.all.where.not(direction: nil)
      export.filters.present? && base.respond_to?(:ransack) ? base.ransack(export.filters).result : base
    else
      raise "Recurso no soportado: #{export.resource}"
    end
  end

  def tmp_path(export, ext)
    dir = Rails.root.join("tmp", "exports", export.tenant_id.to_s)
    FileUtils.mkdir_p(dir)
    dir.join("#{export.id}.#{ext}").to_s
  end

  # S3: sube con ACL privada y devuelve presigned URL.
  # Local: mueve a storage/exports/ (fuera de public/) y devuelve la URL
  #        del endpoint autenticado /api/v1/exports/:id/download.
  def upload_or_persist(export, path)
    if ENV["AWS_S3_BUCKET"].present? && defined?(Aws::S3::Resource)
      key    = "exports/#{export.tenant_id}/#{export.id}.#{export.format}"
      bucket = Aws::S3::Resource.new(region: ENV.fetch("AWS_REGION", "us-east-1"))
                                 .bucket(ENV["AWS_S3_BUCKET"])
      bucket.object(key).upload_file(path, acl: "private")
      bucket.object(key).presigned_url(:get, expires_in: EXPIRY.to_i)
    else
      storage_dir = Rails.root.join("storage", "exports", export.tenant_id.to_s)
      FileUtils.mkdir_p(storage_dir)
      dest = storage_dir.join("#{export.id}.#{export.format}")
      FileUtils.cp(path, dest)
      "#{ENV.fetch('APP_HOST', 'http://localhost:3000')}/api/v1/exports/#{export.id}/download"
    end
  end
end
