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
#   4. Persiste vía Exports::Storage (S3 privado+SSE o disco cifrado Lockbox).
#   5. Setea file_url (referencia interna), expires_at = 7 días, status="succeeded".
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

      url = Exports::Storage.persist!(export, path)

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
end
