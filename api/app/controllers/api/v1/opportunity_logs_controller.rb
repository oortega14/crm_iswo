# frozen_string_literal: true

module Api
  module V1
    # ========================================================================
    # OpportunityLogsController — anidado bajo opportunities
    # ========================================================================
    class OpportunityLogsController < BaseController
      before_action :set_opportunity

      # GET /api/v1/opportunities/:opportunity_id/logs
      def index
        authorize @opportunity, :show?
        render_collection(@opportunity.opportunity_logs.recent.includes(:user), with: OpportunityLogSerializer)
      end

      # POST /api/v1/opportunities/:opportunity_id/logs
      # body: { note: "Llamada confirmada para mañana" }
      def create
        authorize @opportunity, :update?
        log = @opportunity.opportunity_logs.create!(
          tenant: current_tenant,
          user:   current_user,
          action: "note",
          note:   params.require(:note)
        )
        @opportunity.touch_activity!
        render_created(log, with: OpportunityLogSerializer)
      end

      private

      def set_opportunity
        @opportunity = current_tenant.opportunities.find(params[:opportunity_id])
      end
    end
  end
end
