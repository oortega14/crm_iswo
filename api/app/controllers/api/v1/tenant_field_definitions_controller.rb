# frozen_string_literal: true

module Api
  module V1
    # ========================================================================
    # TenantFieldDefinitionsController — campos extra por vertical (F5)
    # ========================================================================
    # GET    /api/v1/tenant_field_definitions?entity=opportunity
    # POST   /api/v1/tenant_field_definitions
    # PATCH  /api/v1/tenant_field_definitions/:id
    # DELETE /api/v1/tenant_field_definitions/:id
    # PATCH  /api/v1/tenant_field_definitions/reorder  { ids: [...] }
    # ========================================================================
    class TenantFieldDefinitionsController < BaseController
      auditable_resource :definition
      before_action :set_definition, only: %i[show update destroy]

      def index
        authorize TenantFieldDefinition
        scope = policy_scope(TenantFieldDefinition).ordered
        scope = scope.for_entity(params[:entity]) if params[:entity].present?
        scope = scope.active unless params[:include_inactive] == "true" && current_user.role_admin?
        render_collection(scope, with: TenantFieldDefinitionSerializer)
      end

      def show
        authorize @definition
        render_resource(@definition, with: TenantFieldDefinitionSerializer)
      end

      def create
        @definition = current_tenant.tenant_field_definitions.new(permitted)
        authorize @definition
        if @definition.save
          render_resource(@definition, with: TenantFieldDefinitionSerializer, status: :created)
        else
          render_unprocessable(@definition)
        end
      end

      def update
        authorize @definition
        if @definition.update(permitted)
          render_resource(@definition, with: TenantFieldDefinitionSerializer)
        else
          render_unprocessable(@definition)
        end
      end

      def destroy
        authorize @definition
        @definition.destroy!
        head :no_content
      end

      def reorder
        authorize TenantFieldDefinition, :update?
        ids = params.require(:ids)
        ids.each_with_index do |id, idx|
          current_tenant.tenant_field_definitions.where(id: id).update_all(position: idx)
        end
        head :no_content
      end

      private

      def set_definition
        @definition = current_tenant.tenant_field_definitions.find(params[:id])
      end

      def permitted
        params.require(:tenant_field_definition).permit(
          :key, :label, :field_type, :required, :entity, :position, :active,
          options: []
        )
      end
    end
  end
end
