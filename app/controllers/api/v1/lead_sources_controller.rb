# frozen_string_literal: true

module Api
  module V1
    class LeadSourcesController < BaseController
      before_action :set_lead_source, only: %i[show update destroy]

      def index
        scope = policy_scope(LeadSource).order(:name)
        scope = scope.where(active: ActiveModel::Type::Boolean.new.cast(params[:active])) if params[:active].present?
        render_collection(scope, with: LeadSourceSerializer)
      end

      def show
        authorize @lead_source
        render_resource(@lead_source, with: LeadSourceSerializer)
      end

      def create
        authorize LeadSource
        record = current_tenant.lead_sources.new(permitted)
        if record.save
          render_created(record, with: LeadSourceSerializer)
        else
          render_unprocessable(record)
        end
      end

      def update
        authorize @lead_source
        if @lead_source.update(permitted)
          render_resource(@lead_source, with: LeadSourceSerializer)
        else
          render_unprocessable(@lead_source)
        end
      end

      def destroy
        authorize @lead_source
        @lead_source.destroy
        render_no_content
      end

      private

      def set_lead_source
        @lead_source = current_tenant.lead_sources.find(params[:id])
      end

      def permitted
        params.require(:lead_source).permit(:name, :kind, :active, metadata: {})
      end
    end
  end
end
