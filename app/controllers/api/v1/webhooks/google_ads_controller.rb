# frozen_string_literal: true

module Api
  module V1
    module Webhooks
      # ========================================================================
      # Webhooks::GoogleAdsController — Google Ads / Lead Form Extension
      # ========================================================================
      # Google manda POST con JSON. La autenticidad se valida con:
      #   - Header `Google-Adwords-Signature` (si está configurado), o
      #   - `key` query param contra GOOGLE_ADS_WEBHOOK_KEY.
      # ========================================================================
      class GoogleAdsController < BaseController
        skip_before_action :authenticate_user!,            raise: false
        skip_before_action :verify_user_belongs_to_tenant, raise: false
        skip_before_action :resolve_tenant!,               raise: false
        skip_around_action :scope_to_tenant,               raise: false

        before_action :verify_key!

        # POST /api/v1/webhooks/google
        def create
          payload = request.request_parameters.presence || JSON.parse(request.raw_post)

          if defined?(WebhookProcessorJob)
            WebhookProcessorJob.perform_later(
              "google_ads",
              payload.merge("received_at" => Time.current.iso8601)
            )
          end

          head :ok
        rescue JSON::ParserError
          head :bad_request
        end

        private

        def verify_key!
          configured = ENV["GOOGLE_ADS_WEBHOOK_KEY"].to_s
          return if configured.blank?

          provided = params[:key].to_s
          head :forbidden unless ActiveSupport::SecurityUtils.secure_compare(configured, provided)
        end
      end
    end
  end
end
