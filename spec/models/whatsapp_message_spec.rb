# frozen_string_literal: true

require "rails_helper"

RSpec.describe WhatsappMessage, type: :model do
  let(:tenant)  { ActsAsTenant.current_tenant }
  let(:contact) { create(:contact, tenant: tenant) }
  subject { build(:whatsapp_message, :outbound, :twilio, tenant: tenant, contact: contact) }

  describe "asociaciones" do
    it { is_expected.to belong_to(:tenant) }
    it { is_expected.to belong_to(:opportunity).optional }
    it { is_expected.to belong_to(:contact).optional }
  end

  describe "validaciones" do
    it { is_expected.to validate_presence_of(:from_number) }
    it { is_expected.to validate_presence_of(:to_number) }
    it { is_expected.to validate_inclusion_of(:direction).in_array(WhatsappMessage::DIRECTIONS) }
    it { is_expected.to validate_inclusion_of(:provider).in_array(WhatsappMessage::PROVIDERS) }
    it { is_expected.to validate_inclusion_of(:status).in_array(WhatsappMessage::STATUSES) }

    it "valida unicidad de provider_message_id por provider" do
      create(:whatsapp_message, :outbound, :twilio, tenant: tenant, provider_message_id: "SM123")
      duplicate = build(:whatsapp_message, :outbound, :twilio, tenant: tenant, provider_message_id: "SM123")
      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:provider_message_id]).to be_present
    end

    it "permite mismo provider_message_id en providers distintos" do
      create(:whatsapp_message, :outbound, :twilio, tenant: tenant, provider_message_id: "abc123")
      other = build(:whatsapp_message, :outbound, :cloud, tenant: tenant, provider_message_id: "abc123")
      expect(other).to be_valid
    end

    it "permite provider_message_id nil en múltiples mensajes del mismo provider" do
      create(:whatsapp_message, :outbound, :twilio, tenant: tenant, provider_message_id: nil)
      expect(build(:whatsapp_message, :outbound, :twilio, tenant: tenant, provider_message_id: nil)).to be_valid
    end
  end

  describe "enums" do
    it "default status=pending" do
      expect(WhatsappMessage.new.status).to eq("pending")
    end

    it "expone predicates prefijados" do
      msg = build(:whatsapp_message, :outbound, :twilio, tenant: tenant, status: "delivered")
      expect(msg.status_delivered?).to be(true)
      expect(msg.direction_out?).to be(true)
      expect(msg.provider_twilio?).to be(true)
    end
  end

  describe "scopes" do
    let!(:inbound)  { create(:whatsapp_message, :inbound,  :twilio, tenant: tenant, contact: contact) }
    let!(:outbound) { create(:whatsapp_message, :outbound, :twilio, tenant: tenant, contact: contact) }

    it ".inbound filtra mensajes entrantes" do
      expect(WhatsappMessage.inbound).to include(inbound)
      expect(WhatsappMessage.inbound).not_to include(outbound)
    end

    it ".outbound filtra mensajes salientes" do
      expect(WhatsappMessage.outbound).to include(outbound)
      expect(WhatsappMessage.outbound).not_to include(inbound)
    end

    it ".recent ordena por created_at descendente" do
      expect(WhatsappMessage.recent.first.created_at).to be >= WhatsappMessage.recent.last.created_at
    end
  end
end
