# frozen_string_literal: true

module Api
  module V1
    # ========================================================================
    # LandingPagesController — gestión interna de landings (editor GrapeJS)
    # ========================================================================
    # El endpoint público (sin auth) vive en Api::V1::Public::LandingPages.
    # ========================================================================
    class LandingPagesController < BaseController
      APPROVAL_REQUEST_MESSAGE =
        "Tu petición ha sido registrada y enviada al administrador de la plataforma. " \
        "En cuanto sea aprobada, te avisaremos que ya está habilitada."

      auditable_resource :landing
      before_action :set_landing, only: %i[show update destroy publish unpublish duplicate metrics]

      def index
        scope = policy_scope(LandingPage).order(updated_at: :desc)
        scope = scope.where(published: true) if params[:published] == "true"

        render_collection(scope, with: LandingPageSerializer)
      end

      def show
        authorize @landing
        render_resource(@landing, with: LandingPageSerializer, params: { include_content: true })
      end

      def create
        authorize LandingPage
        landing = current_tenant.landing_pages.new(permitted)
        landing.requested_by_user_id = current_user.id
        if landing.save
          @landing = landing
          render_pending_request(landing, status: :created)
        else
          render_unprocessable(landing)
        end
      end

      def update
        authorize @landing
        if @landing.update(permitted)
          render_resource(@landing, with: LandingPageSerializer, params: { include_content: true })
        else
          render_unprocessable(@landing)
        end
      end

      def destroy
        authorize @landing
        @landing.destroy
        render_no_content
      end

      def publish
        authorize @landing, :update?
        unless @landing.approval_status_approved?
          return render json: {
            error:   "not_approved",
            message: "Esta landing todavía no fue aprobada por el administrador de la plataforma. " \
                      "Te avisaremos por notificación cuando esté habilitada."
          }, status: :forbidden
        end
        @landing.update!(published: true)
        render_resource(@landing, with: LandingPageSerializer)
      end

      def unpublish
        authorize @landing, :update?
        @landing.update!(published: false)
        render_resource(@landing, with: LandingPageSerializer)
      end

      # GET /api/v1/landing_pages/:id/metrics?days=30
      def metrics
        authorize @landing, :show?

        days   = [[params.fetch(:days, 30).to_i, 1].max, 90].min
        since  = days.days.ago.beginning_of_day

        submissions = @landing.landing_form_submissions.where(created_at: since..)

        daily_leads = submissions
          .group("DATE(created_at AT TIME ZONE 'UTC')")
          .order(Arel.sql("DATE(created_at AT TIME ZONE 'UTC') ASC"))
          .count
          .map { |date, count| { date: date.to_s, count: count } }

        top_utm = submissions
          .group(:utm_source)
          .order(Arel.sql("COUNT(*) DESC"))
          .limit(5)
          .count
          .map { |source, count| { source: source.presence || "directo", count: count } }

        render json: {
          data: {
            view_count:      @landing.view_count,
            lead_count:      @landing.lead_count,
            conversion_rate: @landing.conversion_rate,
            period_days:     days,
            daily_leads:     daily_leads,
            top_utm_sources: top_utm
          }
        }, status: :ok
      end

      # POST /api/v1/landing_pages/:id/duplicate
      def duplicate
        authorize @landing, :create?
        copy = @landing.dup
        copy.assign_attributes(
          title:                "#{@landing.title} (copia)",
          slug:                 "#{@landing.slug}-copy-#{SecureRandom.hex(3)}",
          published:            false,
          published_at:         nil,
          view_count:           0,
          lead_count:           0,
          approval_status:      "pending",
          requested_by_user_id: current_user.id,
          reviewed_by_user_id:  nil,
          reviewed_at:          nil,
          rejection_reason:     nil
        )
        copy.save!
        render_pending_request(copy, status: :created)
      end

      private

      def render_pending_request(landing, status:)
        Notifications::LandingRequestNotifier.submitted(landing: landing, requested_by: current_user)
        payload = LandingPageSerializer.new(landing).serializable_hash
        payload[:meta] = { message: APPROVAL_REQUEST_MESSAGE }
        render json: payload, status: status
      end

      def set_landing
        @landing = current_tenant.landing_pages.find(params[:id])
      end

      def permitted
        params.require(:landing_page).permit(
          :title, :slug, :seo_title, :seo_description, :og_image_url,
          :thumbnail_url, :published, content: {}, styles: {}
        )
      end
    end
  end
end
