# frozen_string_literal: true

# ============================================================================
# WebhookJsonPayload — lee JSON desde raw_post para no disparar el parseo
# temprano de Rack con `request.request_parameters` (body JSON inválido → 500).
# ============================================================================
module WebhookJsonPayload
  extend ActiveSupport::Concern

  INVALID_JSON_BODY = :invalid_webhook_json

  private

  # Para Content-Type application/json usa solo raw_post + JSON.parse.
  # Otros tipos (form-urlencoded) delegan en request_parameters.
  def parsed_webhook_payload
    return request.request_parameters.presence || {} unless json_webhook_content_type?

    raw = request.raw_post.to_s
    return {} if raw.blank?

    JSON.parse(raw)
  rescue JSON::ParserError
    INVALID_JSON_BODY
  end

  # RSpec/request specs a veces no rellenan media_type; miramos varias fuentes Rack.
  def json_webhook_content_type?
    mt = request.media_type.to_s.downcase
    ct = request.content_type.to_s.downcase
    env_ct = request.env["CONTENT_TYPE"].to_s.downcase
    hdr = request.headers["Content-Type"].to_s.downcase
    [mt, ct, env_ct, hdr].any? { |s| s.include?("application/json") }
  end
end
