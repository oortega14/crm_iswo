# frozen_string_literal: true

module Api
  module V1
    module Public
      class LandingFormSubmissionsController < BaseController
        skip_before_action :authenticate_user!, raise: false

        # POST /api/v1/public/landings/:slug/submit
        def create
          landing = current_tenant.landing_pages.where(published: true).find_by!(slug: params[:slug])

          submission = landing.landing_form_submissions.new(
            tenant:       current_tenant,
            payload:      payload_params,
            utm_source:   params[:utm_source],
            utm_medium:   params[:utm_medium],
            utm_campaign: params[:utm_campaign],
            utm_term:     params[:utm_term],
            utm_content:  params[:utm_content],
            ip_address:   request.remote_ip,
            user_agent:   request.user_agent
          )

          unless submission.save
            return render json: {
              error:   "unprocessable_entity",
              details: submission.errors.as_json(full_messages: true)
            }, status: :unprocessable_entity
          end

          unless LandingSubmissionProcessor.new(submission).call
            submission.reload
            return render json: {
              error:   "processing_failed",
              message: submission.process_error.presence ||
                       "No se pudo crear el contacto u oportunidad. Revisa pipeline y usuarios del tenant.",
              data:    { id: submission.id, status: "failed" }
            }, status: :unprocessable_entity
          end

          landing.increment!(:lead_count)
          submission.reload

          render json: {
            data: {
              id:             submission.id,
              status:         "received",
              opportunity_id: submission.opportunity_id,
              contact_id:     submission.contact_id
            }
          }, status: :created
        end

        private

        def payload_params
          params.fetch(:payload, {}).permit!.to_h
        end
      end
    end
  end
end
