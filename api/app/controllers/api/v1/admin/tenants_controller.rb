# frozen_string_literal: true

module Api
  module V1
    module Admin
      # ========================================================================
      # Admin::TenantsController — onboarding de tenants (JWT admin super-admin)
      # ========================================================================
      class TenantsController < ApplicationController
        include Devise::Controllers::Helpers
        include PlatformTenantAuthorizable

        before_action :authenticate_platform_tenant_admin!
        before_action :set_managed_tenant, only: [:update]

        # GET /api/v1/admin/tenants — listado para onboarding (super-admin)
        def index
          tenants = ActsAsTenant.without_tenant do
            Tenant.kept.order(:name).select(:id, :slug, :name, :active, :created_at)
          end
          render json: { data: tenants.map { |t| tenant_json(t) } }, status: :ok
        end

        # POST /api/v1/admin/tenants
        def create
          p = tenant_params
          password_generated = p[:admin_password].blank?
          admin_password     = p[:admin_password].presence || SecureRandom.hex(12)

          result = Tenants::Onboarder.new(
            slug:           p[:slug],
            name:           p[:name],
            admin_email:    p[:admin_email],
            admin_name:     p[:admin_name].presence || "Administrador",
            admin_password: admin_password,
            currency:       p[:currency].presence || "COP",
            timezone:       p[:timezone].presence || "America/Bogota",
            locale:         p[:locale].presence   || "es-CO",
            logo_url:       p[:logo_url],
            primary_color:  p[:primary_color].presence || "#0F172A",
            vertical:       p[:vertical].presence
          ).call

          audit_tenant_onboard!(result.tenant)

          render json: {
            data: tenant_json(result.tenant).merge(
              admin_email:              result.admin_user.email,
              pipeline_id:              result.pipeline.id,
              password_generated:       password_generated,
              generated_admin_password: password_generated ? admin_password : nil
            )
          }, status: :created
        rescue ActiveRecord::RecordInvalid => e
          render_unprocessable_from_record(e)
        rescue ActiveRecord::RecordNotUnique => e
          render json: {
            error:   "unprocessable_entity",
            message: duplicate_tenant_message(e)
          }, status: :unprocessable_entity
        end

        # PATCH /api/v1/admin/tenants/:id — activar / desactivar
        def update
          desired_active = ActiveModel::Type::Boolean.new.cast(tenant_update_params[:active])
          if desired_active.nil?
            return render json: {
              error:   "unprocessable_entity",
              message: "Indica tenant[active] como true o false."
            }, status: :unprocessable_entity
          end

          if PlatformTenant.protected_from_deactivation?(@managed_tenant.slug) && desired_active == false
            return render json: {
              error:   "forbidden",
              message: "No se puede desactivar el tenant plataforma (#{PlatformTenant::SLUG})."
            }, status: :forbidden
          end

          previous_active = @managed_tenant.active
          @managed_tenant.update!(active: desired_active)

          if previous_active != desired_active
            audit_tenant_status!(@managed_tenant, desired_active)
          end

          render json: { data: tenant_json(@managed_tenant) }, status: :ok
        end

        private

        def set_managed_tenant
          @managed_tenant = ActsAsTenant.without_tenant { Tenant.kept.find_by(id: params[:id]) }
          return if @managed_tenant

          render json: {
            error:   "not_found",
            message: "Tenant no encontrado."
          }, status: :not_found
        end

        def tenant_json(tenant)
          {
            id:         tenant.id,
            slug:       tenant.slug,
            name:       tenant.name,
            active:     tenant.active,
            created_at: tenant.created_at
          }
        end

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
            :admin_email, :admin_name, :admin_password, :vertical
          )
        end

        def tenant_update_params
          params.require(:tenant).permit(:active)
        end

        def audit_tenant_onboard!(tenant)
          AuditLogger.record!(
            tenant:      nil,
            user:        current_user,
            action:      "tenant_onboard",
            entity_type: "Tenant",
            entity_id:   tenant.id,
            metadata:    { slug: tenant.slug, name: tenant.name },
            ip_address:  request.remote_ip,
            user_agent:  request.user_agent
          )
        end

        def audit_tenant_status!(tenant, active)
          AuditLogger.record!(
            tenant:      nil,
            user:        current_user,
            action:      active ? "tenant_activate" : "tenant_deactivate",
            entity_type: "Tenant",
            entity_id:   tenant.id,
            metadata:    { slug: tenant.slug, name: tenant.name, active: active },
            ip_address:  request.remote_ip,
            user_agent:  request.user_agent
          )
        end
      end
    end
  end
end
