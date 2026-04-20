# frozen_string_literal: true

module Api
  module V1
    # ========================================================================
    # MeController — perfil del usuario autenticado
    # ========================================================================
    # GET /api/v1/me devuelve el user serializado + `permissions` resumido
    # (gracias al param :include_permissions en UserSerializer).
    # ========================================================================
    class MeController < BaseController
      # GET /api/v1/me
      def show
        render_resource(current_user, with: UserSerializer, params: { include_permissions: true })
      end

      # PATCH /api/v1/me
      def update
        if current_user.update(me_params)
          render_resource(current_user, with: UserSerializer, params: { include_permissions: true })
        else
          render_unprocessable(current_user)
        end
      end

      private

      def me_params
        params.require(:user).permit(:first_name, :last_name, :phone, :avatar_url, preferences: {})
      end
    end
  end
end
