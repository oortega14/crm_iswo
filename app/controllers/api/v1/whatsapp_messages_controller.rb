# frozen_string_literal: true

module Api
  module V1
    # ========================================================================
    # WhatsappMessagesController — listar / ver / enviar mensajes
    # ========================================================================
    # Los mensajes entrantes no se crean acá — entran por webhook.
    # ========================================================================
    class WhatsappMessagesController < BaseController
      before_action :set_opportunity, only: :create
      before_action :set_message, only: :show

      # GET /api/v1/whatsapp_messages (standalone o anidado)
      def index
        scope = if params[:opportunity_id].present?
                  current_tenant.opportunities.find(params[:opportunity_id]).whatsapp_messages
                else
                  policy_scope(WhatsappMessage)
                end

        render_collection(scope.recent, with: WhatsappMessageSerializer)
      end

      def show
        authorize @message
        params_hash = { include_raw: ActiveModel::Type::Boolean.new.cast(params[:include_raw]) }
        render_resource(@message, with: WhatsappMessageSerializer, params: params_hash)
      end

      # POST /api/v1/opportunities/:opportunity_id/whatsapp_messages
      # body: { to_number, body, media_url? }
      def create
        authorize @opportunity, :update?

        msg = @opportunity.whatsapp_messages.new(
          tenant:      current_tenant,
          contact:     @opportunity.contact,
          direction:   "out",
          provider:    ENV.fetch("WHATSAPP_PROVIDER", "twilio"),
          from_number: tenant_whatsapp_number,
          to_number:   params.require(:to_number),
          body:        params[:body],
          media_url:   params[:media_url],
          status:      "queued"
        )

        if msg.save
          WhatsappDeliveryJob.perform_later(msg.id) if defined?(WhatsappDeliveryJob)
          @opportunity.touch_activity!
          render json: WhatsappMessageSerializer.new(msg).serializable_hash, status: :accepted
        else
          render_unprocessable(msg)
        end
      end

      private

      def set_opportunity
        @opportunity = current_tenant.opportunities.find(params[:opportunity_id])
      end

      def set_message
        @message = current_tenant.whatsapp_messages.find(params[:id])
      end

      def tenant_whatsapp_number
        current_tenant.settings.dig("whatsapp", "number") || ENV.fetch("TWILIO_WHATSAPP_NUMBER", "")
      end
    end
  end
end
