# frozen_string_literal: true

module Api
  module V1
    module Admin
      # ========================================================================
      # Admin::TenantsController — onboarding de nuevos tenants (super-admin)
      # ========================================================================
      # Protegido con SUPER_ADMIN_TOKEN en header X-Admin-Token.
      # No usa acts_as_tenant — opera fuera del scope de tenant.
      # ========================================================================
      class TenantsController < ApplicationController
        before_action :authenticate_super_admin!

        # POST /api/v1/admin/tenants
        # Body: { tenant: { slug, name, currency, timezone, locale, logo_url, primary_color,
        #                   admin_email, admin_name, admin_password } }
        def create
          p = tenant_params

          result = Tenants::Onboarder.new(
            slug:           p[:slug],
            name:           p[:name],
            admin_email:    p[:admin_email],
            admin_name:     p[:admin_name],
            admin_password: p[:admin_password].presence || SecureRandom.hex(12),
            currency:       p[:currency].presence || "COP",
            timezone:       p[:timezone].presence || "America/Bogota",
            locale:         p[:locale].presence   || "es-CO",
            logo_url:       p[:logo_url],
            primary_color:  p[:primary_color].presence || "#0F172A"
          ).call

          render json: {
            data: {
              tenant_id:    result.tenant.id,
              slug:         result.tenant.slug,
              name:         result.tenant.name,
              admin_email:  result.admin_user.email,
              pipeline_id:  result.pipeline.id
            }
          }, status: :created
        rescue ActiveRecord::RecordInvalid => e
          render json: {
            error:   "unprocessable_entity",
            message: e.message,
            details: e.record&.errors&.as_json(full_messages: true)
          }, status: :unprocessable_entity
        end

        private

        def authenticate_super_admin!
          token = request.headers["X-Admin-Token"].to_s
          expected = ENV.fetch("SUPER_ADMIN_TOKEN", nil)

          unless expected.present? && ActiveSupport::SecurityUtils.secure_compare(token, expected)
            render json: { error: "unauthorized", message: "Token de administrador inválido" },
                   status: :unauthorized
          end
        end

        def tenant_params
          params.require(:tenant).permit(
            :slug, :name, :currency, :timezone, :locale, :logo_url, :primary_color,
            :admin_email, :admin_name, :admin_password
          )
        end
      end
    end
  end
end
