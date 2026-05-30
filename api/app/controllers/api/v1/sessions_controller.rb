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
      include RefreshTokenCookies

      skip_before_action :verify_signed_out_user, only: :destroy
      skip_before_action :assert_is_devise_resource!, only: :refresh
      respond_to :json

      # POST /api/v1/sessions
      def create
        self.resource = warden.authenticate!(auth_options)
        sign_in(resource_name, resource)
        issue_refresh_cookie(resource)
        log_session_audit("login", resource)

        render json: user_payload(resource).merge(
          meta: { tenant: { id: current_tenant.id, slug: current_tenant.slug } }
        ), status: :ok
      end

      # DELETE /api/v1/sessions
      def destroy
        user   = current_user
        tenant = current_tenant rescue nil
        log_session_audit("logout", user, tenant) if user && tenant
        revoke_refresh_session!(user) if user
        # sign_out dispara el TokenRevoker de warden-jwt_auth que llama User.find_for_jwt_authentication
        # (scoped por acts_as_tenant). Usamos without_tenant para que lo encuentre por PK sin scope.
        ActsAsTenant.without_tenant { sign_out(resource_name) } if user
        head :no_content
      end

      # POST /api/v1/sessions/refresh
      def refresh
        token = normalize_refresh_cookie(cookies.encrypted[:refresh_token])
        user  = find_user_for_refresh(token)

        unless user && refresh_token_matches?(token, user)
          log_refresh_failure(token, user, "jti_or_expired")
          return render_invalid_refresh
        end

        if user.tenant_id != current_tenant.id
          log_refresh_failure(token, user, "tenant_mismatch")
          return render_invalid_refresh
        end

        sign_in(user, store: false)
        issue_refresh_cookie(user)

        render json: user_payload(user), status: :ok
      end

      private

      def normalize_refresh_cookie(raw)
        return nil if raw.blank?

        h = raw.is_a?(Hash) ? raw.stringify_keys : nil
        return h if h&.dig("user_id").present?

        nil
      end

      def find_user_for_refresh(token)
        return nil unless token.is_a?(Hash)

        uid = token["user_id"]
        ActsAsTenant.without_tenant { User.kept.active.find_by(id: uid) }
      end

      def log_refresh_failure(token, user, reason)
        return unless Rails.env.development?

        Rails.logger.info(
          "[Sessions#refresh] denied reason=#{reason} " \
          "user_id=#{user&.id} tenant_header=#{request.headers['X-Tenant-Slug']} " \
          "cookie_jti=#{token&.dig('jti').present?} stored_jti=#{user&.refresh_token_jti.present?}"
        )
      end

      def render_invalid_refresh
        clear_refresh_cookie
        render json: {
          error:   "invalid_refresh_token",
          message: "Refresh token inválido o expirado. Vuelve a iniciar sesión."
        }, status: :unauthorized
      end

      def user_payload(user)
        UserSerializer.new(user, params: { include_permissions: true }).serializable_hash
      end

      def respond_to_on_destroy
        head :no_content
      end

      def log_session_audit(action, user, tenant = nil)
        t = tenant || (current_tenant rescue nil)
        return unless t

        ActsAsTenant.with_tenant(t) do
          AuditLogger.record!(
            tenant:       t,
            user:         user,
            action:       action,
            entity_type:  "User",
            entity_id:    user.id,
            metadata:     {},
            ip_address:   request.remote_ip,
            user_agent:   request.user_agent
          )
        end
      rescue StandardError => e
        Rails.logger.warn("[AuditEvent] #{action}: #{e.message}")
      end
    end
  end
end
