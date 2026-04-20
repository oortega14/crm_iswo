# frozen_string_literal: true

module Api
  module V1
    # ========================================================================
    # TenantsController — configuración del tenant actual (singular)
    # ========================================================================
    class TenantsController < BaseController
      # GET /api/v1/tenant
      def show
        authorize current_tenant
        render_resource(current_tenant, with: TenantSerializer)
      end

      # PATCH /api/v1/tenant
      def update
        authorize current_tenant
        if current_tenant.update(tenant_params)
          render_resource(current_tenant, with: TenantSerializer)
        else
          render_unprocessable(current_tenant)
        end
      end

      private

      def tenant_params
        params.require(:tenant).permit(
          :name, :legal_name, :tax_id, :logo_url, :brand_color,
          :timezone, :locale, :currency, :country_code, settings: {}
        )
      end
    end
  end
end
