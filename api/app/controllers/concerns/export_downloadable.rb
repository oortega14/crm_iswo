# frozen_string_literal: true

# ============================================================================
# ExportDownloadable — GET /resource/export.csv|.xlsx (RFC §6.7).
# ============================================================================
module ExportDownloadable
  extend ActiveSupport::Concern

  MAX_SYNC_ROWS = 5_000

  private

  def export_download_for(resource_name)
    authorize resource_name.to_s.classify.constantize, :export?

    result = nil
    file_format = params[:file_format].to_s.presence
    file_format = request.path.to_s.end_with?(".csv") ? "csv" : "xlsx" if file_format.blank?
    unless Export::FORMATS.include?(file_format)
      return render json: { error: "invalid_format", message: "Use csv o xlsx" },
                    status: :unprocessable_entity
    end

    scope = Exports::ScopedCollection.new(
      user:     current_user,
      resource: resource_name,
      filters:  normalize_export_filters_param
    ).resolve

    row_estimate = scope.limit(MAX_SYNC_ROWS + 1).size
    if row_estimate > MAX_SYNC_ROWS
      return render json: {
        error:   "export_too_large",
        message: "Demasiados registros. Usa POST /#{resource_name}/export para exportación asíncrona."
      }, status: :unprocessable_entity
    end

    result = Exports::FileBuilder.build(
      scope:    scope,
      resource: resource_name,
      format:   file_format,
      basename: resource_name
    )

    record_export_audit!(
      resource:   resource_name,
      format:     file_format,
      filters:    normalize_export_filters_param,
      row_count:  result.row_count,
      sync:       true
    )

    # send_data lee el contenido antes de retornar; send_file es lazy y el ensure
    # borraría el archivo antes de que Rack lo sirva en entornos sin X-Sendfile.
    data = File.binread(result.path)
    send_data data,
              filename:    result.filename,
              type:        mime_for_export(file_format),
              disposition: "attachment"
  ensure
    File.delete(result.path) if defined?(result) && result&.path && File.exist?(result.path)
  end

  def mime_for_export(format)
    case format
    when "xlsx" then "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else             "text/csv; charset=utf-8"
    end
  end
end
