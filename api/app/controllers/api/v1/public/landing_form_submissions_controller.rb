# frozen_string_literal: true

module Api
  module V1
    module Public
      # ========================================================================
      # Public::LandingFormSubmissionsController — intake público de leads
      # ========================================================================
      # Endpoint SIN autenticación. El SPA público postea aquí y:
      #   1. Se crea LandingFormSubmission con payload + UTM.
      #   2. LandingSubmissionProcessor (job) resuelve/crea Contact + Opportunity.
      #   3. Se incrementa lead_count de la landing.
      # ========================================================================
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

          if submission.save
            landing.increment!(:lead_count)
            LandingSubmissionProcessor.new(submission).call_later if defined?(LandingSubmissionProcessor)

            render json: { data: { id: submission.id, status: "received" } }, status: :created
          else
            render json: { error: "unprocessable_entity",
                           details: submission.errors.as_json(full_messages: true) },
                   status: :unprocessable_entity
          end
        end

        private

        def payload_params
          # Acepta cualquier campo del form (GrapeJS es libre). Se sanitiza en
          # el procesador, acá solo guardamos el hash completo.
          params.fetch(:payload, {}).permit!.to_h
        end
      end
    end
  end
end
