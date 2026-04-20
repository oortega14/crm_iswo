# frozen_string_literal: true

module Api
  module V1
    module Public
      # ========================================================================
      # Public::LandingPagesController — render público de landings
      # ========================================================================
      # Endpoint SIN autenticación. Se resuelve tenant por subdominio (igual
      # que el resto), pero no se exige JWT.
      # ========================================================================
      class LandingPagesController < BaseController
        skip_before_action :authenticate_user!, raise: false

        # GET /api/v1/public/landing_pages/:slug
        def show
          landing = current_tenant.landing_pages.where(published: true).find_by!(slug: params[:slug])
          landing.increment!(:view_count)

          render json: {
            data: {
              id:              landing.id,
              title:           landing.title,
              slug:            landing.slug,
              seo_title:       landing.seo_title,
              seo_description: landing.seo_description,
              og_image_url:    landing.og_image_url,
              content:         landing.content,
              styles:          landing.styles,
              published_at:    landing.published_at
            }
          }
        end
      end
    end
  end
end
