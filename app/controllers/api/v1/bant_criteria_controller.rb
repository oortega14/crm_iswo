# frozen_string_literal: true

module Api
  module V1
    # ========================================================================
    # BantCriteriaController — singleton por tenant
    # ========================================================================
    class BantCriteriaController < BaseController
      before_action :set_criterion

      def show
        authorize @criterion
        render_resource(@criterion, with: BantCriterionSerializer)
      end

      def update
        authorize @criterion
        if @criterion.update(permitted)
          render_resource(@criterion, with: BantCriterionSerializer)
        else
          render_unprocessable(@criterion)
        end
      end

      private

      def set_criterion
        @criterion = current_tenant.bant_criterion || current_tenant.create_bant_criterion!
      end

      def permitted
        params.require(:bant_criterion).permit(
          :budget_weight, :authority_weight, :need_weight, :timeline_weight,
          :description, :active
        )
      end
    end
  end
end
