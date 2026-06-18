# frozen_string_literal: true

require "digest"

# Blind Index — búsquedas exactas sobre campos cifrados (Contact PII Fase 2).
unless ENV["BLIND_INDEX_MASTER_KEY"].present?
  if ENV["LOCKBOX_MASTER_KEY"].present?
    ENV["BLIND_INDEX_MASTER_KEY"] = ENV["LOCKBOX_MASTER_KEY"]
  elsif !Rails.env.production?
    sk = Rails.application.secret_key_base.to_s
    seed = sk.present? ? "crm_iswo:blind_index:#{Rails.env}:#{sk}" : "crm_iswo:blind_index:fallback"
    ENV["BLIND_INDEX_MASTER_KEY"] = Digest::SHA256.hexdigest(seed)
  end
end

if ENV["BLIND_INDEX_MASTER_KEY"].present?
  BlindIndex.master_key = ENV["BLIND_INDEX_MASTER_KEY"]
else
  Rails.logger.warn("[BlindIndex] BLIND_INDEX_MASTER_KEY ausente: búsquedas PII cifradas fallarán.")
end
