# frozen_string_literal: true

# ============================================================================
# ExportGenerationJob — genera el archivo asociado a un Export.
# ============================================================================
# Soporta resource = "contacts" | "opportunities" | "whatsapp_messages".
# Soporta format   = "xlsx" (caxlsx) | "csv".
#
# Flujo:
#   1. Marca el export como status="processing".
#   2. Construye el scope respetando filters (Ransack-friendly hash).
#   3. Genera archivo en /tmp/exports/<tenant>/<export_id>.<format>.
#   4. Sube a S3 (si AWS_S3_BUCKET está seteado) o copia a public/exports/.
#   5. Setea file_url, expires_at = 7 días, status="ready".
#   6. Notifica al usuario (in_app o email).
# ============================================================================
class ExportGenerationJob < ApplicationJob
  queue_as :exports

  EXPIRY = 7.days

  def perform(export_id)
    export = Export.find_by(id: export_id)
    return unless export

    ActsAsTenant.with_tenant(export.tenant) do
      export.update!(status: "processing", started_at: Time.current)

      path = case export.format
             when "xlsx" then build_xlsx(export)
             when "csv"  then build_csv(export)
             else raise "Formato no soportado: #{export.format}"
             end

      url = upload_or_persist(export, path)

      export.update!(
        status:     "ready",
        file_url:   url,
        file_size:  File.size(path),
        expires_at: EXPIRY.from_now,
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
    require "caxlsx"

    path  = tmp_path(export, "xlsx")
    p     = Axlsx::Package.new
    wb    = p.workbook
    rows  = collection(export)

    wb.add_worksheet(name: export.resource.titleize) do |sheet|
      headers = rows.first&.attributes&.keys || []
      sheet.add_row(headers)
      rows.find_each { |r| sheet.add_row(headers.map { |h| r[h] }) }
    end

    p.serialize(path)
    path
  end

  def build_csv(export)
    require "csv"

    path = tmp_path(export, "csv")
    rows = collection(export)
    headers = rows.first&.attributes&.keys || []

    CSV.open(path, "w") do |csv|
      csv << headers
      rows.find_each { |r| csv << headers.map { |h| r[h] } }
    end
    path
  end

  def collection(export)
    base = case export.resource
           when "contacts"          then Contact.all
           when "opportunities"     then Opportunity.all
           when "whatsapp_messages" then WhatsappMessage.all.where.not(direction: nil)
           else raise "Recurso no soportado: #{export.resource}"
           end

    if export.filters.present? && base.respond_to?(:ransack)
      base.ransack(export.filters).result
    else
      base
    end
  end

  def tmp_path(export, ext)
    dir = Rails.root.join("tmp", "exports", export.tenant_id.to_s)
    FileUtils.mkdir_p(dir)
    dir.join("#{export.id}.#{ext}").to_s
  end

  # Si hay S3 configurado lo sube; si no, mueve a /public/exports y devuelve URL local.
  def upload_or_persist(export, path)
    if ENV["AWS_S3_BUCKET"].present? && defined?(Aws::S3::Resource)
      key = "exports/#{export.tenant_id}/#{export.id}.#{export.format}"
      bucket = Aws::S3::Resource.new(region: ENV.fetch("AWS_REGION", "us-east-1")).bucket(ENV["AWS_S3_BUCKET"])
      bucket.object(key).upload_file(path, acl: "private")
      bucket.object(key).presigned_url(:get, expires_in: EXPIRY.to_i)
    else
      public_dir = Rails.root.join("public", "exports", export.tenant_id.to_s)
      FileUtils.mkdir_p(public_dir)
      dest = public_dir.join("#{export.id}.#{export.format}")
      FileUtils.cp(path, dest)
      "#{ENV.fetch('APP_HOST', 'http://localhost:3000')}/exports/#{export.tenant_id}/#{export.id}.#{export.format}"
    end
  end
end
