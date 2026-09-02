# frozen_string_literal: true

require "rails_helper"

RSpec.describe WhatsApp::OutboundSender do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:contact) { create(:contact, tenant: tenant) }
  let!(:twilio_integration) do
    create(:ad_integration, :twilio,
           tenant:             tenant,
           account_identifier: "+5731999999999",
           credentials:      { "account_sid" => "ACxxxxxxxx", "auth_token" => "secret" })
  end

  around do |example|
    old_provider = ENV.delete("WHATSAPP_PROVIDER")
    old_number   = ENV.delete("TWILIO_WHATSAPP_NUMBER")
    example.run
  ensure
    ENV["WHATSAPP_PROVIDER"]      = old_provider if old_provider
    ENV["TWILIO_WHATSAPP_NUMBER"] = old_number   if old_number
  end

  before { allow(WhatsappDeliveryJob).to receive(:perform_now) }

  it "arma y guarda el mensaje saliente con el número de la integración configurada" do
    result = described_class.call(
      tenant: tenant, contact: contact, to_number: "3001234567", body: "Hola"
    )

    expect(result.success?).to be(true)
    expect(result.message).to be_persisted
    expect(result.message.direction).to eq("out")
    expect(result.message.from_number).to eq("+5731999999999")
    expect(result.message.to_number).to eq("+573001234567")
    expect(WhatsappDeliveryJob).to have_received(:perform_now).with(result.message.id)
  end

  it "asocia la oportunidad cuando se pasa y actualiza su última actividad" do
    pipeline = create(:pipeline_with_stages, tenant: tenant)
    opportunity = create(:opportunity, tenant: tenant, contact: contact,
                          pipeline: pipeline, pipeline_stage: pipeline.pipeline_stages.first,
                          last_activity_at: 1.week.ago)

    result = described_class.call(
      tenant: tenant, contact: contact, opportunity: opportunity,
      to_number: "3001234567", body: "Hola"
    )

    expect(result.message.opportunity_id).to eq(opportunity.id)
    expect(opportunity.reload.last_activity_at).to be_within(5.seconds).of(Time.current)
  end

  it "funciona sin oportunidad (envío standalone desde el inbox)" do
    result = described_class.call(
      tenant: tenant, contact: contact, to_number: "3001234567", body: "Hola"
    )

    expect(result.success?).to be(true)
    expect(result.message.opportunity_id).to be_nil
  end

  it "devuelve error_code :not_configured si el tenant no tiene envío saliente" do
    twilio_integration.destroy!

    result = described_class.call(
      tenant: tenant, contact: contact, to_number: "3001234567", body: "Hola"
    )

    expect(result.success?).to be(false)
    expect(result.error_code).to eq(:not_configured)
    expect(result.message).to be_nil
  end
end
