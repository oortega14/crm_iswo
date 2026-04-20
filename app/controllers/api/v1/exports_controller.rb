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

      # POST /api/v1/exports  { resource: "contacts"|"opportunities", format, filters }
      def create
        authorize Export, :create?
        export = current_tenant.exports.create!(
          user:     current_user,
          resource: params.require(:resource),
          format:   params.fetch(:format, "xlsx"),
          filters:  params.fetch(:filters, {}).permit!.to_h
        )
        ExportGenerationJob.perform_later(export.id) if defined?(ExportGenerationJob)

        render json: ExportSerializer.new(export).serializable_hash, status: :accepted
      end

      private

      def set_export
        @export = current_tenant.exports.find(params[:id])
      end
    end
  end
end
