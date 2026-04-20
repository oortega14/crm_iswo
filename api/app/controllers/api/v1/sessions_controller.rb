# frozen_string_literal: true

module Api
  module V1
    # ========================================================================
    # SessionsController — login, logout y refresh
    # ========================================================================
    # POST   /api/v1/sessions          → login (devuelve access JWT + refresh cookie)
    # DELETE /api/v1/sessions          → logout (revoca JTI en jwt_denylists)
    # POST   /api/v1/sessions/refresh  → nuevo access con refresh cookie
    #
    # Hereda de Devise::SessionsController para aprovechar toda la maquinaria
    # de Warden + devise-jwt. El token sale automáticamente en el header
    # `Authorization` por el middleware de devise-jwt.
    # ========================================================================
    class SessionsController < Devise::SessionsController
      include TenantResolver
      include ErrorHandler

      skip_before_action :verify_signed_out_user, only: :destroy
      respond_to :json

      # POST /api/v1/sessions
      def create
        self.resource = warden.authenticate!(auth_options)
        sign_in(resource_name, resource)
        issue_refresh_cookie(resource)

        render json: user_payload(resource).merge(
          meta: { tenant: { id: current_tenant.id, slug: current_tenant.slug } }
        ), status: :ok
      end

      # DELETE /api/v1/sessions
      def destroy
        sign_out(resource_name) if current_user
        clear_refresh_cookie
        head :no_content
      end

      # POST /api/v1/sessions/refresh
      def refresh
        token = cookies.encrypted[:refresh_token]
        user  = User.find_by(id: token&.dig("user_id")) if token.is_a?(Hash)

        return render_invalid_refresh unless user && token_valid?(token)
        return render_invalid_refresh unless user.tenant_id == current_tenant.id

        sign_in(user, store: false)
        issue_refresh_cookie(user)

        render json: user_payload(user), status: :ok
      end

      private

      def issue_refresh_cookie(user)
        cookies.encrypted[:refresh_token] = {
          value: {
            user_id:    user.id,
            issued_at:  Time.current.to_i,
            expires_at: 7.days.from_now.to_i
          },
          expires:   7.days.from_now,
          httponly:  true,
          secure:    Rails.env.production?,
          same_site: :lax
        }
      end

      def clear_refresh_cookie
        cookies.delete(:refresh_token)
      end

      def token_valid?(token)
        token["expires_at"].to_i > Time.current.to_i
      end

      def render_invalid_refresh
        clear_refresh_cookie
        render json: {
          error:   "invalid_refresh_token",
          message: "Refresh token inválido o expirado"
        }, status: :unauthorized
      end

      def user_payload(user)
        UserSerializer.new(user, params: { include_permissions: true }).serializable_hash
      end

      def respond_to_on_destroy
        head :no_content
      end
    end
  end
end
