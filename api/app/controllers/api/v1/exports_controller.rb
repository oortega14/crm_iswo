# frozen_string_literal: true

module Api
  module V1
    # ========================================================================
    # ExportsController — historial y creación de exportaciones async
    # ========================================================================
    class ExportsController < BaseController
      before_action :set_export, only: :show

      def index
        scope = policy_scope(Export).active.order(created_at: :desc)
        render_collection(scope, with: ExportSerializer)
      end

      def show
        authorize @export
        render_resource(@export, with: ExportSerializer)
      end

      # POST /api/v1/exports  { resource: "contacts"|"opportunities", export_format, filters }
      def create
        authorize Export, :create?
        export = current_tenant.exports.create!(
          user:     current_user,
          resource: params.require(:resource),
          format:   resolve_export_file_format,
          filters:  normalize_export_filters_param
        )
        safe_enqueue_export_generation_job(export.id)

        render_resource(export, with: ExportSerializer, status: :accepted)
      end

      private

      def set_export
        @export = current_tenant.exports.find(params[:id])
      end
    end
  end
end
