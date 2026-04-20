# frozen_string_literal: true

module Api
  module V1
    # ========================================================================
    # LandingPagesController — gestión interna de landings (editor GrapeJS)
    # ========================================================================
    # El endpoint público (sin auth) vive en Api::V1::Public::LandingPages.
    # ========================================================================
    class LandingPagesController < BaseController
      before_action :set_landing, only: %i[show update destroy publish unpublish duplicate]

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
        if landing.save
          render_created(landing, with: LandingPageSerializer)
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
        @landing.update!(published: true)
        render_resource(@landing, with: LandingPageSerializer)
      end

      def unpublish
        authorize @landing, :update?
        @landing.update!(published: false)
        render_resource(@landing, with: LandingPageSerializer)
      end

      # POST /api/v1/landing_pages/:id/duplicate
      def duplicate
        authorize @landing, :create?
        copy = @landing.dup
        copy.assign_attributes(
          title:        "#{@landing.title} (copia)",
          slug:         "#{@landing.slug}-copy-#{SecureRandom.hex(3)}",
          published:    false,
          published_at: nil,
          view_count:   0,
          lead_count:   0
        )
        copy.save!
        render_created(copy, with: LandingPageSerializer)
      end

      private

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
