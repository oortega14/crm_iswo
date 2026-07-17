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
      include LoginTenantResolvable
      include ErrorHandler
      include RefreshTokenCookies

      skip_before_action :verify_signed_out_user, only: :destroy
      skip_before_action :assert_is_devise_resource!, only: :refresh
      skip_before_action :resolve_tenant!, only: %i[create refresh destroy]
      skip_around_action :scope_to_tenant, only: :destroy
      before_action :resolve_login_tenant_from_credentials!, only: :create
      before_action :resolve_refresh_tenant!, only: :refresh
      respond_to :json

      # POST /api/v1/sessions
      def create
        return if performed?
        return render_login_tenant_required unless @current_tenant

        ActsAsTenant.with_tenant(@current_tenant) do
          self.resource = warden.authenticate!(auth_options)
          sign_in(resource_name, resource)
          issue_refresh_cookie(resource)
          log_session_audit("login", resource)

          render json: user_payload(resource).merge(
            meta: tenant_meta
          ), status: :ok
        end
      end

      # DELETE /api/v1/sessions
      def destroy
        ActsAsTenant.without_tenant do
          user = current_user || user_from_refresh_cookie
          tenant = user&.tenant

          log_session_audit("logout", user, tenant) if user && tenant
          revoke_refresh_session!(user) if user
          clear_refresh_cookie

          if user && warden.authenticated?(resource_name)
            sign_out(resource_name)
          end
        end

        head :no_content
      end

      # POST /api/v1/sessions/refresh
      def refresh
        return if performed?
        return render_login_tenant_required unless @current_tenant

        token = normalize_refresh_cookie(cookies.encrypted[:refresh_token])
        user  = find_user_for_refresh(token)

        unless user && refresh_token_matches?(token, user)
          log_refresh_denied!("jti_or_expired", user, token)
          return render_invalid_refresh
        end

        if user.tenant_id != current_tenant.id
          log_refresh_denied!("tenant_mismatch", user, token)
          return render_invalid_refresh
        end

        ActsAsTenant.with_tenant(@current_tenant) do
          sign_in(user, store: false)
          issue_refresh_cookie(user)
          log_session_audit("token_refresh", user)

          render json: user_payload(user).merge(meta: tenant_meta), status: :ok
        end
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

      def user_from_refresh_cookie
        token = normalize_refresh_cookie(cookies.encrypted[:refresh_token])
        find_user_for_refresh(token)
      end

      def log_refresh_denied!(reason, user, token)
        if Rails.env.development?
          Rails.logger.info(
            "[Sessions#refresh] denied reason=#{reason} " \
            "user_id=#{user&.id} tenant_header=#{request.headers['X-Tenant-Slug']} " \
            "cookie_jti=#{token&.dig('jti').present?} stored_jti=#{user&.refresh_token_jti.present?}"
          )
        end

        # A diferencia del log de arriba (solo dev), esto sí debe quedar en
        # producción: un refresh denegado (JTI inválido/expirado o tenant
        # distinto) es un evento de seguridad que ISO A.8.16 exige trazar.
        t = current_tenant
        return unless t

        ActsAsTenant.with_tenant(t) do
          AuditLogger.record!(
            tenant:       t,
            user:         user,
            action:       "refresh_denied",
            entity_type:  "User",
            entity_id:    user&.id,
            metadata:     { reason: reason },
            ip_address:   request.remote_ip,
            user_agent:   request.user_agent
          )
        end
      rescue StandardError => e
        Rails.logger.warn("[AuditEvent] refresh_denied: #{e.message}")
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

      def resolve_refresh_tenant!
        slug = tenant_slug_from_header || tenant_slug_from_subdomain
        if slug.present?
          tenant = ActsAsTenant.without_tenant { Tenant.kept.find_by(slug: slug) }
          return render_tenant_not_found(slug) unless tenant
          return render_tenant_inactive unless tenant.active?

          set_request_tenant!(tenant)
          return
        end

        token = normalize_refresh_cookie(cookies.encrypted[:refresh_token])
        user  = find_user_for_refresh(token)
        tenant = ActsAsTenant.without_tenant { user&.tenant }
        return render_invalid_refresh unless tenant&.active?

        set_request_tenant!(tenant)
      end

      def tenant_meta
        {
          tenant: {
            id:   current_tenant.id,
            slug: current_tenant.slug,
            name: current_tenant.name
          }
        }
      end

      def render_login_tenant_required
        render json: {
          error:   "tenant_missing",
          message: "No se pudo resolver el tenant para esta sesión."
        }, status: :bad_request
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
