# frozen_string_literal: true

require "digest"

# ============================================================================
# Lockbox — `AdIntegration#credentials` depende de LOCKBOX_MASTER_KEY.
# Sin clave, Lockbox lanza ArgumentError al cifrar → 500 en el SPA al guardar.
#
# Orden: ENV → Rails credentials (`lockbox.master_key`) → solo desarrollo/test:
# clave derivada estable del secret_key_base (permite arrancar sin .env).
# Producción debe definir LOCKBOX_MASTER_KEY explícitamente.
# ============================================================================
unless ENV["LOCKBOX_MASTER_KEY"].present?
  cred =
    begin
      Rails.application.credentials.dig(:lockbox, :master_key)
    rescue StandardError
      nil
    end

  if cred.present?
    ENV["LOCKBOX_MASTER_KEY"] = cred.to_s
  elsif !Rails.env.production?
    sk = Rails.application.secret_key_base.to_s
    # Misma longitud que Lockbox.generate_key → SecureRandom.hex(32)
    ENV["LOCKBOX_MASTER_KEY"] =
      if sk.present?
        Digest::SHA256.hexdigest("crm_iswo:lockbox:#{Rails.env}:#{sk}")
      else
        Digest::SHA256.hexdigest("crm_iswo:lockbox:fallback:no_secret_key_base")
      end
  end
end

Lockbox.master_key = ENV["LOCKBOX_MASTER_KEY"] if ENV["LOCKBOX_MASTER_KEY"].present?

if ENV["LOCKBOX_MASTER_KEY"].blank?
  Rails.logger.warn(
    "[Lockbox] LOCKBOX_MASTER_KEY ausente: integraciones y exports cifrados fallarán."
  )
end
