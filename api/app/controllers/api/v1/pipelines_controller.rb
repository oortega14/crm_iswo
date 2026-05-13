# frozen_string_literal: true

module Api
  module V1
    class PipelinesController < BaseController
      before_action :set_pipeline, only: %i[show update destroy]

      # GET /api/v1/pipelines
      def index
        scope = policy_scope(Pipeline).order(:position, :name)
        render json: PipelineSerializer.new(scope).serializable_hash, status: :ok
      end

      # GET /api/v1/pipelines/:id
      def show
        authorize @pipeline
        render_resource(@pipeline, with: PipelineSerializer)
      end

      # POST /api/v1/pipelines
      def create
        authorize Pipeline
        assign_pipeline_defaults!
        @pipeline = current_tenant.pipelines.new(pipeline_params)
        if @pipeline.save
          render_created(@pipeline, with: PipelineSerializer)
        else
          render_unprocessable(@pipeline)
        end
      end

      def update
        authorize @pipeline
        assign_pipeline_defaults!
        if @pipeline.update(pipeline_params)
          render_resource(@pipeline, with: PipelineSerializer)
        else
          render_unprocessable(@pipeline)
        end
      end

      def destroy
        authorize @pipeline
        @pipeline.destroy
        render_no_content
      end

      private

      def set_pipeline
        @pipeline = current_tenant.pipelines.find(params[:id])
      end

      def pipeline_params
        params.require(:pipeline).permit(:name, :description, :is_default, :position)
      end

      # Índice único parcial: solo un is_default=true por tenant.
      def assign_pipeline_defaults!
        want_default = ActiveModel::Type::Boolean.new.cast(pipeline_params[:is_default])
        return unless want_default

        q = current_tenant.pipelines
        q = q.where.not(id: @pipeline.id) if @pipeline&.persisted?
        q.update_all(is_default: false)
      end
    end
  end
end
