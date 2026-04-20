# frozen_string_literal: true

module Api
  module V1
    module Webhooks
      # ========================================================================
      # Webhooks::WhatsappController — Twilio WhatsApp + Meta Cloud API
      # ========================================================================
      # Soporta dos proveedores con el mismo pipeline:
      #   - Twilio:  POST application/x-www-form-urlencoded (X-Twilio-Signature)
      #   - Cloud:   GET verify + POST JSON (X-Hub-Signature-256)
      #
      # Cada mensaje entrante se encola en WebhookProcessorJob, que:
      #   1. resuelve el tenant por el número destino (to_number)
      #   2. busca/crea Contact
      #   3. persiste el WhatsappMessage con direction="in"
      #   4. dispara notificaciones (reminders, asignación automática, etc.)
      # ========================================================================
      class WhatsappController < BaseController
        skip_before_action :authenticate_user!,            raise: false
        skip_before_action :verify_user_belongs_to_tenant, raise: false
        skip_before_action :resolve_tenant!,               raise: false
        skip_around_action :scope_to_tenant,               raise: false

        before_action :verify_twilio_signature!, only: :twilio
        before_action :verify_cloud_signature!,  only: :cloud

        # POST /api/v1/webhooks/whatsapp/twilio
        def twilio
          payload = request.request_parameters
          if defined?(WebhookProcessorJob)
            WebhookProcessorJob.perform_later(
              "whatsapp_twilio",
              payload.merge("received_at" => Time.current.iso8601)
            )
          end
          head :ok
        end

        # GET /api/v1/webhooks/whatsapp/cloud (verify)
        def verify_cloud
          if params["hub.verify_token"] == ENV["WHATSAPP_CLOUD_VERIFY_TOKEN"]
            render plain: params["hub.challenge"], status: :ok
          else
            head :forbidden
          end
        end

        # POST /api/v1/webhooks/whatsapp/cloud
        def cloud
          payload = request.request_parameters.presence || JSON.parse(request.raw_post)
          if defined?(WebhookProcessorJob)
            WebhookProcessorJob.perform_later(
              "whatsapp_cloud",
              payload.merge("received_at" => Time.current.iso8601)
            )
          end
          head :ok
        rescue JSON::ParserError
          head :bad_request
        end

        private

        # Valida firma de Twilio según auth token. Si no hay token configurado
        # (dev), deja pasar.
        def verify_twilio_signature!
          token = ENV["TWILIO_AUTH_TOKEN"].to_s
          return if token.blank?

          signature = request.headers["X-Twilio-Signature"].to_s
          url       = request.original_url
          data      = request.request_parameters.sort.join
          expected  = Base64.strict_encode64(OpenSSL::HMAC.digest("SHA1", token, url + data))

          head :forbidden unless ActiveSupport::SecurityUtils.secure_compare(signature, expected)
        end

        def verify_cloud_signature!
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
