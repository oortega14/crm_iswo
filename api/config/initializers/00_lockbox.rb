# frozen_string_literal: true

require "digest"
require Rails.root.join("lib/security_key_format")

# ============================================================================
# Lockbox — carga antes que blind_index.rb (prefijo 00_).
# ============================================================================

raw_env = ENV["LOCKBOX_MASTER_KEY"].to_s.strip
invalid_env_placeholder = raw_env.present? && !SecurityKeyFormat.valid?(raw_env)

unless SecurityKeyFormat.valid?(raw_env)
  cred =
    begin
      Rails.application.credentials.dig(:lockbox, :master_key)
    rescue StandardError
      nil
    end

  derived =
    if SecurityKeyFormat.valid?(cred)
      cred.to_s
    elsif !Rails.env.production?
      sk = Rails.application.secret_key_base.to_s
      if sk.present?
        Digest::SHA256.hexdigest("crm_iswo:lockbox:#{Rails.env}:#{sk}")
      else
        Digest::SHA256.hexdigest("crm_iswo:lockbox:fallback:no_secret_key_base")
      end
    end

  ENV["LOCKBOX_MASTER_KEY"] = derived if SecurityKeyFormat.valid?(derived)
  ENV["LOCKBOX_KEY_SOURCE"] = "derived" if SecurityKeyFormat.valid?(derived)
end

if SecurityKeyFormat.valid?(raw_env)
  ENV["LOCKBOX_KEY_SOURCE"] = "explicit"
end

if invalid_env_placeholder
  Rails.logger.warn(
    "[Lockbox] LOCKBOX_MASTER_KEY ignorada (formato inválido; requiere 64 hex). " \
    "Usando clave derivada de dev. Persiste con: bundle exec rails runner \"puts ENV.fetch('LOCKBOX_MASTER_KEY')\""
  )
end

if SecurityKeyFormat.valid?(ENV["LOCKBOX_MASTER_KEY"])
  Lockbox.master_key = ENV["LOCKBOX_MASTER_KEY"]
else
  Rails.logger.warn(
    "[Lockbox] LOCKBOX_MASTER_KEY ausente: integraciones y exports cifrados fallarán."
  )
end
