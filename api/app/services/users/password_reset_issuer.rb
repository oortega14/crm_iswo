# frozen_string_literal: true

module Users
  # Genera el token compatible con Devise y envía `UserMailer#password_reset`
  # (evita Devise::Mailer y rutas tipo `edit_user_password_url`, inexistentes en API-only).
  class PasswordResetIssuer
    def initialize(user:)
      @user = user
    end

    def call
      # Solo admins pueden recuperar contraseña por este flujo.
      # Retornamos silenciosamente para no revelar si el email existe con otro rol.
      return unless @user&.role_admin?

      ActsAsTenant.with_tenant(@user.tenant) do
        raw_token, enc_token = Devise.token_generator.generate(User, :reset_password_token)
        @user.update_columns(
          reset_password_token: enc_token,
          reset_password_sent_at: Time.current,
          updated_at: Time.current
        )
        next unless defined?(UserMailer)

        mail = UserMailer.with(user: @user, reset_token: raw_token).password_reset

        raw_token.tap do
          # En test usamos :test (deliveries); en dev letter_opener; en prod encolar.
          if Rails.env.development? || Rails.env.test?
            mail.deliver_now
          else
            mail.deliver_later
          end
        end
      end
    end
  end
end
