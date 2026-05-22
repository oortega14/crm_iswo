# frozen_string_literal: true

module Api
  module V1
    module Webhooks
      # ========================================================================
      # Webhooks::OpenWaController — recibe eventos de un servidor OpenWA.
      # ========================================================================
      # OpenWA envía una firma HMAC-SHA256 en el header X-OpenWA-Signature
      # (hex digest sin prefijo) cuando el webhook se configura con `secret`.
      # Si ENV["OPENWA_WEBHOOK_SECRET"] está vacío, la firma se ignora (dev).
      # ========================================================================
      class OpenWaController < BaseController
        include WebhookEnqueue
        include WebhookJsonPayload

        skip_before_action :authenticate_user!,            raise: false
        skip_before_action :verify_user_belongs_to_tenant, raise: false
        skip_before_action :resolve_tenant!,               raise: false
        skip_around_action :scope_to_tenant,               raise: false

        before_action :verify_openwa_signature!

        # POST /api/v1/webhooks/whatsapp/openwa
        def create
          payload = parsed_webhook_payload
          return head :bad_request if payload == WebhookJsonPayload::INVALID_JSON_BODY

          enqueue_webhook_processor(
            "whatsapp_openwa",
            payload.merge("received_at" => Time.current.iso8601)
          )
          head :ok
        end

        private

        def verify_openwa_signature!
          secret = ENV["OPENWA_WEBHOOK_SECRET"].to_s
          return if secret.blank?

          signature = request.headers["X-OpenWA-Signature"].to_s
          expected  = OpenSSL::HMAC.hexdigest("SHA256", secret, request.raw_post)
          head :forbidden unless ActiveSupport::SecurityUtils.secure_compare(signature, expected)
        end
      end
    end
  end
end
