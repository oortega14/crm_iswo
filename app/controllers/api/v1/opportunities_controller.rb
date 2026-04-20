# frozen_string_literal: true

module Api
  module V1
    # ========================================================================
    # OpportunitiesController — CRUD + acciones de dominio + Kanban + export
    # ========================================================================
    class OpportunitiesController < BaseController
      before_action :set_opportunity, only: %i[show update destroy move_stage assign merge recalculate_bant]

      # GET /api/v1/opportunities
      def index
        scope = policy_scope(Opportunity).kept.includes(:contact, :pipeline_stage, :owner_user)

        scope = scope.where(status: params[:status])                       if params[:status].present?
        scope = scope.where(pipeline_id: params[:pipeline_id])             if params[:pipeline_id].present?
        scope = scope.where(pipeline_stage_id: params[:pipeline_stage_id]) if params[:pipeline_stage_id].present?
        scope = scope.where(owner_user_id: params[:owner_id])              if params[:owner_id].present?
        scope = scope.where("title ILIKE ?", "%#{params[:q]}%")            if params[:q].present?
        scope = scope.stale(params[:stale_days].to_i)                      if params[:stale_days].present?

        render_collection(scope.order(last_activity_at: :desc), with: OpportunitySerializer)
      end

      def show
        authorize @opportunity
        render_resource(@opportunity, with: OpportunitySerializer)
      end

      def create
        authorize Opportunity
        @opportunity = current_tenant.opportunities.new(create_params.merge(owner_user: current_user))
        if @opportunity.save
          log_action!("create", @opportunity.attributes)
          render_created(@opportunity, with: OpportunitySerializer)
        else
          render_unprocessable(@opportunity)
        end
      end

      def update
        authorize @opportunity
        before = @opportunity.attributes.dup
        if @opportunity.update(update_params)
          @opportunity.touch_activity!
          log_action!("update", diff(before, @opportunity.attributes))
          render_resource(@opportunity, with: OpportunitySerializer)
        else
          render_unprocessable(@opportunity)
        end
      end

      def destroy
        authorize @opportunity
        @opportunity.discard
        render_no_content
      end

      # POST /api/v1/opportunities/:id/move_stage  { pipeline_stage_id }
      def move_stage
        authorize @opportunity, :move_stage?
        new_stage = current_tenant.pipeline_stages.find(params.require(:pipeline_stage_id))
        from = @opportunity.pipeline_stage_id

        @opportunity.update!(pipeline_stage_id: new_stage.id)
        @opportunity.update!(status: "won")  if new_stage.closed_won
        @opportunity.update!(status: "lost") if new_stage.closed_lost
        @opportunity.touch_activity!
        log_action!("stage_change", { from_stage_id: from, to_stage_id: new_stage.id })

        render_resource(@opportunity, with: OpportunitySerializer)
      end

      # POST /api/v1/opportunities/:id/assign  { owner_user_id }
      def assign
        authorize @opportunity, :assign?
        new_owner = current_tenant.users.find(params.require(:owner_user_id))
        from = @opportunity.owner_user_id
        @opportunity.update!(owner_user_id: new_owner.id)
        log_action!("assign", { from: from, to: new_owner.id })
        render_resource(@opportunity, with: OpportunitySerializer)
      end

      # POST /api/v1/opportunities/:id/merge  { target_id }
      def merge
        authorize @opportunity, :merge?
        target = current_tenant.opportunities.find(params.require(:target_id))
        if defined?(Opportunities::Merger)
          Opportunities::Merger.new(source: @opportunity, target: target, performed_by: current_user).call
        end
        render_resource(target.reload, with: OpportunitySerializer)
      end

      # POST /api/v1/opportunities/:id/recalculate_bant
      def recalculate_bant
        authorize @opportunity, :recalculate_bant?
        Opportunities::BantScorer.new(@opportunity).call_and_persist! if defined?(Opportunities::BantScorer)
        render_resource(@opportunity, with: OpportunitySerializer)
      end

      # GET /api/v1/opportunities/kanban?pipeline_id=...
      def kanban
        authorize Opportunity, :kanban?
        pipeline = current_tenant.pipelines.find(params.require(:pipeline_id))
        stages   = pipeline.pipeline_stages.order(:position)

        scope = policy_scope(Opportunity).kept.where(pipeline: pipeline).includes(:contact, :owner_user)
        grouped = scope.group_by(&:pipeline_stage_id)

        render json: {
          data: stages.map do |stage|
            {
              stage:         PipelineStageSerializer.new(stage).serializable_hash[:data],
              opportunities: OpportunitySerializer.new(grouped[stage.id] || []).serializable_hash[:data]
            }
          end
        }, status: :ok
      end

      # POST /api/v1/opportunities/export
      def export
        authorize Opportunity, :export?
        export = current_tenant.exports.create!(
          user:     current_user,
          resource: "opportunities",
          format:   params.fetch(:format, "xlsx"),
          filters:  params.fetch(:filters, {}).permit!.to_h
        )
        ExportGenerationJob.perform_later(export.id) if defined?(ExportGenerationJob)
        render_resource(export, with: ExportSerializer, status: :accepted)
      end

      private

      def set_opportunity
        @opportunity = current_tenant.opportunities.kept.find(params[:id])
      end

      def create_params
        params.require(:opportunity).permit(
          :contact_id, :pipeline_id, :pipeline_stage_id, :lead_source_id,
          :title, :notes, :estimated_value, :status,
          :expected_close_date, custom_fields: {}, bant_data: {}
        )
      end

      def update_params
        params.require(:opportunity).permit(
          :title, :notes, :estimated_value, :status,
          :expected_close_date, :bant_score, :lost_reason, :lead_source_id,
          custom_fields: {}, bant_data: {}
        )
      end

      def log_action!(action, changes_data)
        @opportunity.opportunity_logs.create!(
          tenant:       current_tenant,
          user:         current_user,
          action:       action,
          changes_data: changes_data,
          ip_address:   request.remote_ip,
          user_agent:   request.user_agent
        )
      end

      def diff(before, after)
        keys = (before.keys + after.keys).uniq - %w[updated_at]
        keys.each_with_object({}) do |k, h|
          h[k] = { from: before[k], to: after[k] } if before[k] != after[k]
        end
      end
    end
  end
end
