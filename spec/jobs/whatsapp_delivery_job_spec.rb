# frozen_string_literal: true

require "rails_helper"

RSpec.describe WhatsappDeliveryJob, type: :job do
  let(:tenant)  { ActsAsTenant.current_tenant }
  let(:contact) { create(:contact, tenant: tenant) }
  let(:message) do
    create(:whatsapp_message, :outbound, :twilio, tenant: tenant, contact: contact, status: "queued")
  end

  describe "#perform" do
    it "encola en la cola :integrations" do
      expect(described_class.new.queue_name).to eq("integrations")
    end

    it "delega a WhatsApp::MessageSender" do
      sender = instance_double(WhatsApp::MessageSender, deliver: true)
      expect(WhatsApp::MessageSender).to receive(:new).with(message).and_return(sender)

      described_class.new.perform(message.id)
    end

    it "ejecuta dentro del scope del tenant del mensaje" do
      ActsAsTenant.current_tenant = nil
      expect(WhatsApp::MessageSender).to receive(:new) do |msg|
        expect(ActsAsTenant.current_tenant).to eq(msg.tenant)
        instance_double(WhatsApp::MessageSender, deliver: true)
      end

      described_class.new.perform(message.id)
    end

    it "no hace nada si el mensaje no existe" do
      expect(WhatsApp::MessageSender).not_to receive(:new)
      expect { described_class.new.perform(0) }.not_to raise_error
    end

    %w[sent delivered read].each do |terminal_status|
      it "es idempotente cuando el mensaje ya está '#{terminal_status}'" do
        message.update_column(:status, terminal_status)
        expect(WhatsApp::MessageSender).not_to receive(:new)
        described_class.new.perform(message.id)
      end
    end

    it "configura retry_on Faraday::Error hasta 5 intentos" do
      handler = described_class.rescue_handlers.find { |(klass, _)| klass == "Faraday::Error" }
      expect(handler).to be_present
    end
  end
end
