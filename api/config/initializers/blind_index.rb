# frozen_string_literal: true

require "digest"
require Rails.root.join("lib/security_key_format")

# Blind Index — búsquedas exactas sobre campos cifrados (Contact PII Fase 2).
# En dev sin BLIND_INDEX explícita usa seed propio (compat. con datos existentes).
# En prod: define BLIND_INDEX_MASTER_KEY o LOCKBOX_MASTER_KEY explícita (64 hex).

unless SecurityKeyFormat.valid?(ENV["BLIND_INDEX_MASTER_KEY"])
  lockbox_key = ENV["LOCKBOX_MASTER_KEY"].to_s.strip
  use_lockbox = SecurityKeyFormat.valid?(lockbox_key) && ENV["LOCKBOX_KEY_SOURCE"] == "explicit"

  if use_lockbox
    ENV["BLIND_INDEX_MASTER_KEY"] = lockbox_key
  elsif !Rails.env.production?
    sk = Rails.application.secret_key_base.to_s
    seed = sk.present? ? "crm_iswo:blind_index:#{Rails.env}:#{sk}" : "crm_iswo:blind_index:fallback"
    ENV["BLIND_INDEX_MASTER_KEY"] = Digest::SHA256.hexdigest(seed)
  end
end

if SecurityKeyFormat.valid?(ENV["BLIND_INDEX_MASTER_KEY"])
  BlindIndex.master_key = ENV["BLIND_INDEX_MASTER_KEY"]
else
  Rails.logger.warn("[BlindIndex] BLIND_INDEX_MASTER_KEY ausente: búsquedas PII cifradas fallarán.")
end
