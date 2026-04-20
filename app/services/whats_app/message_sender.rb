# frozen_string_literal: true

module WhatsApp
  # ==========================================================================
  # WhatsApp::MessageSender — envía un WhatsappMessage outbound.
  # ==========================================================================
  # Patrón adapter: el servicio elige el adapter (Twilio o Cloud) según el
  # `provider` del WhatsappMessage. Cada adapter expone `#deliver(message)`
  # y devuelve { provider_message_id:, status: }.
  #
  # Este servicio se invoca desde WhatsappDeliveryJob, no directamente desde
  # el controller (queremos persistencia + retry async).
  # ==========================================================================
  class MessageSender
    class DeliveryError < StandardError; end

    # Mapea provider del modelo (PROVIDERS = %w[twilio whatsapp_cloud]) al
    # nombre de la clase adapter. Se mantiene "cloud" como alias por
    # compatibilidad con configuraciones antiguas.
    ADAPTERS = {
      "twilio"         => "WhatsApp::Adapters::Twilio",
      "whatsapp_cloud" => "WhatsApp::Adapters::Cloud",
      "cloud"          => "WhatsApp::Adapters::Cloud"
    }.freeze

    def initialize(message)
      @message = message
    end

    # Sincrónico (lo invoca el job). Devuelve true/false.
    def deliver
      adapter = build_adapter
      result  = adapter.deliver(@message)

      @message.update!(
        provider_message_id: result[:provider_message_id],
        status:              result[:status] || "sent",
        sent_at:             Time.current
      )
      true
    rescue DeliveryError, Faraday::Error => e
      @message.update!(status: "failed", error_message: e.message.truncate(500))
      false
    end

    # Atajo para encolar el envío (usado por servicios externos).
    def deliver_later
      WhatsappDeliveryJob.perform_later(@message.id) if defined?(WhatsappDeliveryJob)
    end

    private

    def build_adapter
      klass_name = ADAPTERS[@message.provider]
      raise DeliveryError, "Provider no soportado: #{@message.provider}" unless klass_name

      # Carga lazy: las clases adapter pueden no estar implementadas aún.
      klass = klass_name.safe_constantize
      raise DeliveryError, "Adapter no implementado: #{klass_name}" unless klass

      klass.new(tenant: @message.tenant)
    end
  end
end
