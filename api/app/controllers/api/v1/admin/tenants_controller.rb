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
        include Devise::Controllers::Helpers
        include SuperAdminAuthenticatable
        include IswoPlatformAuthorizable

        before_action :authenticate_super_admin!
        before_action :authenticate_iswo_platform_admin!

        # GET /api/v1/admin/tenants — listado para onboarding (super-admin)
        def index
          tenants = Tenant.kept.order(:name).select(:id, :slug, :name, :active, :created_at)
          render json: {
            data: tenants.map { |t|
              {
                id:         t.id,
                slug:       t.slug,
                name:       t.name,
                active:     t.active,
                created_at: t.created_at
              }
            }
          }, status: :ok
        end

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
          render_unprocessable_from_record(e)
        rescue ActiveRecord::RecordNotUnique => e
          render json: {
            error:   "unprocessable_entity",
            message: duplicate_tenant_message(e)
          }, status: :unprocessable_entity
        end

        private

        def render_unprocessable_from_record(exception)
          record = exception.record
          render json: {
            error:   "unprocessable_entity",
            message: record&.errors&.full_messages&.to_sentence.presence || exception.message,
            details: record&.errors&.as_json(full_messages: true)
          }, status: :unprocessable_entity
        end

        def duplicate_tenant_message(exception)
          return "Ya existe un tenant con ese slug o email." if exception.message.blank?

          exception.message
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
