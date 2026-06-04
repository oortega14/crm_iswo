# frozen_string_literal: true

# Aviso al arrancar si falta la clave de Claude en desarrollo.
if Rails.env.development? && ENV["ANTHROPIC_API_KEY"].to_s.strip.blank?
  Rails.logger.info(
    "[Anthropic] ANTHROPIC_API_KEY vacía en api/.env — " \
    "pega tu clave y reinicia bin/rails s. Clasificación usará reglas locales."
  )
end
