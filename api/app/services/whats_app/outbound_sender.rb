# frozen_string_literal: true

module WhatsApp
  # ============================================================================
  # WhatsApp::OutboundSender — arma y despacha un WhatsappMessage saliente.
  # ============================================================================
  # Extraído de WhatsappMessagesController#create para reutilizarse también
  # desde el envío standalone del inbox (WhatsappConversationsController), sin
  # depender de que exista una Opportunity.
  #
  # Envío síncrono (WhatsappDeliveryJob.perform_now): el caller espera el
  # resultado del proveedor (status/error_message) en la misma petición HTTP,
  # sin depender de que Solid Queue/Sidekiq estén levantados.
  # ============================================================================
  class OutboundSender
    Result = Struct.new(:message, :error_code, keyword_init: true) do
      def success?
        error_code.nil?
      end
    end

    def self.call(...)
      new(...).call
    end

    def initialize(tenant:, contact:, to_number:, body:, opportunity: nil, media_url: nil)
      @tenant      = tenant
      @contact     = contact
      @to_number   = to_number
      @body        = body
      @opportunity = opportunity
      @media_url   = media_url
    end

    def call
      provider    = @tenant.whatsapp_outbound_provider
      from_number = @tenant.whatsapp_outbound_from_number_for(provider)
      return Result.new(error_code: :not_configured) if from_number.blank?

      msg = build_message(provider, from_number)
      return Result.new(message: msg, error_code: :invalid) unless msg.save

      WhatsappDeliveryJob.perform_now(msg.id)
      msg.reload
      @opportunity&.touch_activity!

      Result.new(message: msg)
    end

    private

    def build_message(provider, from_number)
      WhatsappMessage.new(
        tenant:      @tenant,
        opportunity: @opportunity,
        contact:     @contact,
        direction:   "out",
        provider:    provider,
        from_number: from_number,
        to_number:   WhatsappPhone.normalize_to_e164(@to_number),
        body:        @body,
        media_url:   @media_url,
        status:      "queued"
      )
    end
  end
end
