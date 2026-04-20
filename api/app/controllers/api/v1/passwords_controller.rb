# frozen_string_literal: true

module Api
  module V1
    # ========================================================================
    # PasswordsController — flujos de recuperación y cambio de contraseña
    # ========================================================================
    class PasswordsController < ApplicationController
      include TenantResolver
      include ErrorHandler

      before_action :authenticate_user!, only: :change

      # POST /api/v1/password/forgot  { email }
      def forgot
        user = current_tenant.users.find_by(email: params[:email].to_s.downcase.strip)
        user&.send_reset_password_instructions
        # Respuesta uniforme aunque no exista para no leakear cuentas
        head :accepted
      end

      # POST /api/v1/password/reset  { reset_password_token, password, password_confirmation }
      def reset
        result = User.reset_password_by_token(reset_params)
        if result.errors.empty?
          head :no_content
        else
          render json: { error: "invalid_token", details: result.errors.as_json(full_messages: true) },
                 status: :unprocessable_entity
        end
      end

      # POST /api/v1/password/change  { current_password, password, password_confirmation }
      def change
        if current_user.update_with_password(change_params)
          head :no_content
        else
          render json: { error: "invalid_password", details: current_user.errors.as_json(full_messages: true) },
                 status: :unprocessable_entity
        end
      end

      private

      def reset_params
        params.permit(:reset_password_token, :password, :password_confirmation)
      end

      def change_params
        params.require(:user).permit(:current_password, :password, :password_confirmation)
      end
    end
  end
end
