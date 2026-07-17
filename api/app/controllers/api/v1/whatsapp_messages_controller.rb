# frozen_string_literal: true

module Api
  module V1
    # ========================================================================
    # WhatsappMessagesController — listar / ver / enviar mensajes
    # ========================================================================
    # Los mensajes entrantes no se crean acá — entran por webhook.
    # ========================================================================
    class WhatsappMessagesController < BaseController
      before_action :set_opportunity, only: %i[create destroy_all]
      before_action :set_message, only: :show

      # GET /api/v1/whatsapp_messages (standalone o anidado)
      def index
        scope = if params[:opportunity_id].present?
                  opp = policy_scope(Opportunity).kept.find(params[:opportunity_id])
                  authorize opp, :show?
                  opp.whatsapp_messages
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

      # DELETE /api/v1/opportunities/:opportunity_id/whatsapp_messages
      def destroy_all
        authorize @opportunity, :update?
        count = @opportunity.whatsapp_messages.count
        @opportunity.whatsapp_messages.destroy_all
        log_whatsapp_audit!("whatsapp_messages_cleared", metadata: { count: count })
        head :no_content
      end

      # POST /api/v1/opportunities/:opportunity_id/whatsapp_messages
      # body: { to_number, body, media_url? }
      def create
        authorize @opportunity, :update?

        to_raw = params.require(:to_number)
        to_number = WhatsappPhone.normalize_to_e164(to_raw)

        provider    = current_tenant.whatsapp_outbound_provider
        from_number = current_tenant.whatsapp_outbound_from_number_for(provider)
        if from_number.blank?
          return render json: {
            error:   "whatsapp_not_configured",
            message: "Configura el envío saliente en Ajustes → Integraciones: " \
                     "WhatsApp Cloud API (Phone number ID + access token), " \
                     "Twilio (Account SID + Auth Token + número E.164) " \
                     "u OpenWA (URL + API Key + Session ID)."
          }, status: :unprocessable_entity
        end

        msg = @opportunity.whatsapp_messages.new(
          tenant:      current_tenant,
          contact:     @opportunity.contact,
          direction:   "out",
          provider:    provider,
          from_number: from_number,
          to_number:   to_number,
          body:        params[:body],
          media_url:   params[:media_url],
          status:      "queued"
        )

        if msg.save
          # Envío síncrono: así no dependemos de Solid Queue / Sidekiq levantados para
          # que el mensaje llegue al proveedor antes de responder al cliente SPA.
          dispatch_whatsapp_delivery!(msg)
          msg.reload
          @opportunity.touch_activity!
          log_whatsapp_audit!("whatsapp_message_sent", message: msg)
          render json: WhatsappMessageSerializer.new(msg).serializable_hash, status: :accepted
        else
          render_unprocessable(msg)
        end
      end

      private

      def log_whatsapp_audit!(action, message: nil, metadata: {})
        meta = metadata.merge(opportunity_id: @opportunity.id)
        if message
          meta[:message_id] = message.id
          meta[:provider]    = message.provider
          meta[:status]      = message.status
        end

        AuditLogger.record!(
          tenant:      current_tenant,
          user:        current_user,
          action:      action,
          entity_type: "WhatsappMessage",
          entity_id:   message&.id,
          metadata:    meta,
          ip_address:  request.remote_ip,
          user_agent:  request.user_agent
        )
      end

      def dispatch_whatsapp_delivery!(msg)
        return unless defined?(WhatsappDeliveryJob)

        # perform_now: el SPA espera el resultado del proveedor en esta misma
        # petición (status / error_message). perform_later deja el mensaje en
        # "queued" para siempre si Solid Queue no está levantado.
        WhatsappDeliveryJob.perform_now(msg.id)
      end

      def set_opportunity
        @opportunity = policy_scope(Opportunity).kept.find(params[:opportunity_id])
      end

      def set_message
        @message = policy_scope(WhatsappMessage).find(params[:id])
      end
    end
  end
end
