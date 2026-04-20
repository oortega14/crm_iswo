# frozen_string_literal: true

module Api
  module V1
    module Webhooks
      # ========================================================================
      # Webhooks::MetaAdsController — Meta Lead Ads (Facebook / Instagram)
      # ========================================================================
      # Meta envía dos tipos de request:
      #   GET  ?hub.mode=subscribe&hub.challenge=...&hub.verify_token=...
      #        → devolvemos `hub.challenge` en plano (verificación inicial).
      #   POST body JSON con `entry[].changes[].value.leadgen_id` → encolamos.
      # ========================================================================
      # Sin autenticación de usuario (skip_before_action :authenticate_user!).
      # Sí se valida la firma X-Hub-Signature-256 (HMAC SHA256 con app secret).
      # ========================================================================
      class MetaAdsController < BaseController
        skip_before_action :authenticate_user!,            raise: false
        skip_before_action :verify_user_belongs_to_tenant, raise: false
        skip_before_action :resolve_tenant!,               raise: false
        skip_around_action :scope_to_tenant,               raise: false

        before_action :verify_signature!, only: :create

        # GET /api/v1/webhooks/meta (hub verify)
        def verify
          if params["hub.verify_token"] == ENV["META_VERIFY_TOKEN"]
            render plain: params["hub.challenge"], status: :ok
          else
            head :forbidden
          end
        end

        # POST /api/v1/webhooks/meta
        def create
          payload = request.request_parameters.presence || JSON.parse(request.raw_post)

          Array(payload["entry"]).each do |entry|
            Array(entry["changes"]).each do |change|
              value = change["value"] || {}
              next unless value["leadgen_id"].present?

              if defined?(WebhookProcessorJob)
                WebhookProcessorJob.perform_later(
                  "meta_ads",
                  value.merge("page_id" => entry["id"], "received_at" => Time.current.iso8601)
                )
              end
            end
          end

          head :ok
        rescue JSON::ParserError
          head :bad_request
        end

        private

        # Valida HMAC SHA256 contra META_APP_SECRET. Si no hay secret configurado
        # dejamos pasar (útil en dev). En prod DEBE estar seteado.
        def verify_signature!
          secret = ENV["META_APP_SECRET"].to_s
          return if secret.blank?

          signature = request.headers["X-Hub-Signature-256"].to_s
          expected  = "sha256=" + OpenSSL::HMAC.hexdigest("SHA256", secret, request.raw_post)
          head :forbidden unless ActiveSupport::SecurityUtils.secure_compare(signature, expected)
        end
      end
    end
  end
end
