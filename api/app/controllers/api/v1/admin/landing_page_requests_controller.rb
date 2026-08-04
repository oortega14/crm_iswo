# frozen_string_literal: true

module Api
  module V1
    module Admin
      # ========================================================================
      # Admin::LandingPageRequestsController — cola de aprobación de landings
      # ========================================================================
      # Toda landing nace `approval_status: pending` y no puede publicarse hasta
      # que un admin del tenant plataforma (super-admin) la apruebe acá. El
      # solicitante vive en un tenant distinto al del aprobador, así que este
      # controller consulta cross-tenant vía `ActsAsTenant.without_tenant`.
      # ========================================================================
      class LandingPageRequestsController < BaseController
        before_action :set_landing_request, only: %i[approve reject]

        # GET /api/v1/admin/landing_page_requests?status=pending
        def index
          status = LandingPage::APPROVAL_STATUSES.include?(params[:status].to_s) ? params[:status].to_s : "pending"

          data = ActsAsTenant.without_tenant do
            LandingPage.where(approval_status: status)
                       .includes(:tenant, :requested_by)
                       .order(created_at: :desc)
                       .map { |landing| landing_json(landing) }
          end

          render json: { data: data }, status: :ok
        end

        # POST /api/v1/admin/landing_page_requests/:id/approve
        def approve
          ActsAsTenant.with_tenant(@landing.tenant) do
            @landing.update!(
              approval_status:     "approved",
              reviewed_by_user_id: current_user.id,
              reviewed_at:         Time.current,
              rejection_reason:    nil,
              published:           true
            )
          end

          Notifications::LandingRequestNotifier.resolved(landing: @landing, approved: true)
          audit_review!(@landing, "approve")

          render json: { data: landing_json(@landing) }, status: :ok
        rescue ActiveRecord::RecordInvalid => e
          render_unprocessable_from_record(e)
        end

        # POST /api/v1/admin/landing_page_requests/:id/reject
        def reject
          ActsAsTenant.with_tenant(@landing.tenant) do
            @landing.update!(
              approval_status:     "rejected",
              reviewed_by_user_id: current_user.id,
              reviewed_at:         Time.current,
              rejection_reason:    reject_params[:rejection_reason]
            )
          end

          Notifications::LandingRequestNotifier.resolved(landing: @landing, approved: false)
          audit_review!(@landing, "reject")

          render json: { data: landing_json(@landing) }, status: :ok
        rescue ActiveRecord::RecordInvalid => e
          render_unprocessable_from_record(e)
        end

        private

        def set_landing_request
          @landing = ActsAsTenant.without_tenant { LandingPage.find(params[:id]) }
        rescue ActiveRecord::RecordNotFound
          render json: { error: "not_found", message: "Solicitud no encontrada." }, status: :not_found
        end

        def reject_params
          params.permit(:rejection_reason)
        end

        def landing_json(landing)
          {
            id:                landing.id,
            title:             landing.title,
            slug:              landing.slug,
            approval_status:   landing.approval_status,
            public_url:        landing.public_url,
            tenant:            { id: landing.tenant.id, slug: landing.tenant.slug, name: landing.tenant.name },
            requested_by:      landing.requested_by && {
              id:    landing.requested_by.id,
              name:  landing.requested_by.name,
              email: landing.requested_by.email
            },
            created_at:        landing.created_at&.iso8601,
            reviewed_at:       landing.reviewed_at&.iso8601,
            rejection_reason:  landing.rejection_reason
          }
        end

        def render_unprocessable_from_record(exception)
          record = exception.record
          render json: {
            error:   "unprocessable_entity",
            message: record&.errors&.full_messages&.to_sentence.presence || exception.message
          }, status: :unprocessable_entity
        end

        def audit_review!(landing, action)
          AuditLogger.record!(
            tenant:      nil,
            user:        current_user,
            action:      "landing_#{action}",
            entity_type: "LandingPage",
            entity_id:   landing.id,
            metadata:    { slug: landing.slug, tenant_slug: landing.tenant.slug, rejection_reason: landing.rejection_reason },
            ip_address:  request.remote_ip,
            user_agent:  request.user_agent
          )
        end
      end
    end
  end
end
