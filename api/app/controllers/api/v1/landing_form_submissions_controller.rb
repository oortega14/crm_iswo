# frozen_string_literal: true

module Api
  module V1
    # ========================================================================
    # LandingFormSubmissionsController — listado interno (solo index)
    # ========================================================================
    # La creación ocurre en el endpoint público (sin auth). Acá solo se
    # consulta el historial desde el panel interno.
    # ========================================================================
    class LandingFormSubmissionsController < BaseController
      before_action :set_landing

      def index
        authorize @landing, :show?
        scope = @landing.landing_form_submissions.recent.includes(:contact, :opportunity)
        render_collection(scope, with: LandingFormSubmissionSerializer)
      end

      private

      def set_landing
        @landing = current_tenant.landing_pages.find(params[:landing_page_id])
      end
    end
  end
end
