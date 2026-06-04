# frozen_string_literal: true

module Api
  module V1
    # ========================================================================
    # PasswordsController — flujos de recuperación y cambio de contraseña
    # ========================================================================
    class PasswordsController < ApplicationController
      include TenantResolver
      include LoginTenantResolvable
      include ErrorHandler
      include RefreshTokenCookies

      skip_before_action :resolve_tenant!, only: :forgot
      before_action :resolve_login_tenant_from_credentials!, only: :forgot
      before_action :authenticate_user!, only: :change
      before_action :ensure_password_change_allowed!, only: :change

      # POST /api/v1/password/forgot  { email }
      def forgot
        return if performed?

        user = current_tenant.users.find_by(email: params[:email].to_s.downcase.strip)
        Users::PasswordResetIssuer.new(user: user).call
        # Respuesta uniforme aunque no exista para no leakear cuentas
        head :accepted
      rescue StandardError => e
        Rails.logger.error(
          "[PasswordsController#forgot] #{e.class}: #{e.message}\n#{e.backtrace&.first(20)&.join("\n")}"
        )
        head :accepted
      end

      # POST /api/v1/password/reset  { reset_password_token, password, password_confirmation }
      def reset
        result = User.reset_password_by_token(reset_params)
        if result.errors.empty?
          revoke_refresh_session!(result) if result.persisted?
          head :no_content
        else
          render json: { error: "invalid_token", details: result.errors.as_json(full_messages: true) },
                 status: :unprocessable_content
        end
      end

      # POST /api/v1/password/change  { current_password, password, password_confirmation }
      def change
        if current_user.update_with_password(change_params)
          revoke_refresh_session!(current_user)
          head :no_content
        else
          render json: { error: "invalid_password", details: current_user.errors.as_json(full_messages: true) },
                 status: :unprocessable_content
        end
      end

      private

      def reset_params
        params.permit(:reset_password_token, :password, :password_confirmation)
      end

      def change_params
        params.require(:user).permit(:current_password, :password, :password_confirmation)
      end

      # Solo admin y manager pueden cambiar su contraseña desde el perfil (consultores/viewer: no).
      def ensure_password_change_allowed!
        return if current_user.role.in?(%w[admin manager])

        render json: {
          error:   "forbidden",
          message: "Solo administradores y managers pueden cambiar su contraseña."
        }, status: :forbidden
      end
    end
  end
end
