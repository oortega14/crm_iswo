# frozen_string_literal: true

module Api
  module V1
    # ========================================================================
    # DuplicateFlagsController — gestión y resolución de colisiones
    # ========================================================================
    # Los flags se crean automáticamente por el servicio DuplicateDetector al
    # registrar una oportunidad. Aquí se listan, se ven y se resuelven
    # (reasignar, fusionar, ignorar).
    # ========================================================================
    class DuplicateFlagsController < BaseController
      before_action :set_flag, only: %i[show reassign merge ignore]

      # GET /api/v1/duplicate_flags
      def index
        scope = policy_scope(DuplicateFlag).includes(:opportunity, :duplicate_of_opportunity, :detected_by_user)
        scope = scope.where(resolution: params[:resolution]) if params[:resolution].present?
        render_collection(scope.order(created_at: :desc), with: DuplicateFlagSerializer)
      end

      def show
        authorize @flag
        render_resource(@flag, with: DuplicateFlagSerializer)
      end

      # POST /api/v1/duplicate_flags/:id/reassign  { new_owner_user_id }
      def reassign
        authorize @flag, :update?
        new_owner = current_tenant.users.find(params.require(:new_owner_user_id))
        ActiveRecord::Base.transaction do
          @flag.duplicate_of_opportunity.update!(owner_user_id: new_owner.id)
          @flag.resolve!(as: "reassigned", by: current_user, note: params[:note])
        end
        render_no_content
      end

      # POST /api/v1/duplicate_flags/:id/merge  — consolida en la ganadora
      def merge
        authorize @flag, :update?
        if defined?(Opportunities::Merger)
          Opportunities::Merger.new(
            loser:  @flag.opportunity,
            winner: @flag.duplicate_of_opportunity,
            actor:  current_user
          ).call
        end
        @flag.resolve!(as: "merged", by: current_user, note: params[:note])
        render_no_content
      end

      # POST /api/v1/duplicate_flags/:id/ignore
      def ignore
        authorize @flag, :update?
        @flag.resolve!(as: "ignored", by: current_user, note: params[:note])
        render_no_content
      end

      private

      def set_flag
        @flag = current_tenant.duplicate_flags.find(params[:id])
      end
    end
  end
end
