# frozen_string_literal: true

module Api
  module V1
    # ========================================================================
    # AdIntegrationsController — credenciales cifradas de canales externos
    # ========================================================================
    class AdIntegrationsController < BaseController
      before_action :set_integration, only: %i[show update destroy test_connection disable]

      def index
        scope = policy_scope(AdIntegration).order(:provider)
        render_collection(scope, with: AdIntegrationSerializer)
      end

      def show
        authorize @integration
        render_resource(@integration, with: AdIntegrationSerializer)
      end

      def create
        authorize AdIntegration
        integration = current_tenant.ad_integrations.new(permitted)
        if integration.save
          render_created(integration, with: AdIntegrationSerializer)
        else
          render_unprocessable(integration)
        end
      end

      def update
        authorize @integration
        if @integration.update(permitted)
          render_resource(@integration, with: AdIntegrationSerializer)
        else
          render_unprocessable(@integration)
        end
      end

      def destroy
        authorize @integration
        @integration.destroy
        render_no_content
      end

      # POST /api/v1/ad_integrations/:id/test_connection
      def test_connection
        authorize @integration, :update?
        ok = if defined?(Ads::ConnectionTester)
               Ads::ConnectionTester.new(@integration).call
             else
               true
             end

        if ok
          @integration.record_sync!
          render_resource(@integration, with: AdIntegrationSerializer)
        else
          @integration.record_failure!("Test de conexión falló")
          render json: { error: "connection_failed" }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/ad_integrations/:id/disable
      def disable
        authorize @integration, :update?
        @integration.update!(status: "paused")
        render_no_content
      end

      private

      def set_integration
        @integration = current_tenant.ad_integrations.find(params[:id])
      end

      def permitted
        # NOTA: `credentials` se cifra con Lockbox. El SPA manda como hash;
        # nunca se devuelve en la respuesta.
        params.require(:ad_integration).permit(
          :provider, :account_identifier, :status, metadata: {}, credentials: {}
        )
      end
    end
  end
end
