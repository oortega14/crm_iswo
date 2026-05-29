# frozen_string_literal: true

module Api
  module V1
    # ========================================================================
    # ExportsController — historial y creación de exportaciones async
    # ========================================================================
    class ExportsController < BaseController
      include ExportAuditable

      before_action :set_export, only: %i[show download]

      def index
        scope = policy_scope(Export).active.order(created_at: :desc)
        render_collection(scope, with: ExportSerializer)
      end

      def show
        authorize @export
        render_resource(@export, with: ExportSerializer)
      end

      # GET /api/v1/exports/:id/download
      def download
        authorize @export, :download?

        unless @export.status == "succeeded"
          return render json: { error: "not_ready", message: "El export aún no está listo." },
                        status: :unprocessable_entity
        end

        if @export.expires_at.present? && @export.expires_at < Time.current
          return render json: { error: "expired", message: "El export ha expirado." },
                        status: :gone
        end

        local_path = local_export_path(@export)

        if File.exist?(local_path)
          send_file local_path,
                    filename:    "export_#{@export.resource}_#{@export.id}.#{@export.format}",
                    type:        mime_for(@export.format),
                    disposition: "attachment"
        elsif @export.file_url&.start_with?("https://")
          redirect_to @export.file_url, allow_other_host: true, status: :found
        else
          render json: { error: "file_not_found", message: "Archivo no encontrado." },
                 status: :not_found
        end
      end

      # POST /api/v1/exports  { resource: "contacts"|"opportunities", export_format, filters }
      def create
        authorize Export, :create?
        resource = params.require(:resource)
        unless Export::RESOURCES.include?(resource)
          return render json: { error: "invalid_resource",
                                message: "resource debe ser uno de: #{Export::RESOURCES.join(', ')}" },
                        status: :unprocessable_entity
        end

        export = current_tenant.exports.create!(
          user:     current_user,
          resource: resource,
          format:   resolve_export_file_format,
          filters:  normalize_export_filters_param
        )
        safe_enqueue_export_generation_job(export.id)
        record_export_audit!(
          resource: export.resource,
          format:   export.format,
          filters:  export.filters || {},
          sync:     false
        )

        render_resource(export, with: ExportSerializer, status: :accepted)
      end

      private

      def set_export
        @export = current_tenant.exports.find(params[:id])
      end

      # Busca primero en storage/ (nuevos exports), luego en public/ (legados).
      def local_export_path(export)
        storage = Rails.root.join("storage", "exports",
                                  export.tenant_id.to_s,
                                  "#{export.id}.#{export.format}").to_s
        return storage if File.exist?(storage)

        Rails.root.join("public", "exports",
                        export.tenant_id.to_s,
                        "#{export.id}.#{export.format}").to_s
      end

      def mime_for(format)
        case format
        when "xlsx" then "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        else             "text/csv; charset=utf-8"
        end
      end

    end
  end
end
