# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::WhatsappMessages (oportunidad)", type: :request do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:admin) { create(:user, :admin, tenant: tenant) }
  let!(:twilio_integration) do
    create(:ad_integration, :twilio,
           tenant:             tenant,
           account_identifier: "+5731999999999",
           credentials:      { "account_sid" => "ACxxxxxxxx", "auth_token" => "secret" })
  end
  let(:contact) { create(:contact, tenant: tenant) }
  let(:opportunity) { create(:opportunity, tenant: tenant, contact: contact, owner_user: admin) }

  # El .env de desarrollo puede tener WHATSAPP_PROVIDER=openwa que interfiere
  # con la selección del adapter. Lo limpiamos para estos tests.
  around do |example|
    old_provider = ENV.delete("WHATSAPP_PROVIDER")
    old_number   = ENV.delete("TWILIO_WHATSAPP_NUMBER")
    example.run
  ensure
    ENV["WHATSAPP_PROVIDER"]      = old_provider if old_provider
    ENV["TWILIO_WHATSAPP_NUMBER"] = old_number   if old_number
  end

  describe "POST /api/v1/opportunities/:opportunity_id/whatsapp_messages" do
    it "usa el número de la integración Twilio como remitente y acepta el mensaje" do
      # El controller llama WhatsappDeliveryJob.perform_now (inline).
      # Lo stubamos para evitar la conexión HTTP real a Twilio bloqueada por WebMock.
      allow(WhatsappDeliveryJob).to receive(:perform_now)

      post "/api/v1/opportunities/#{opportunity.id}/whatsapp_messages",
           params:  { to_number: contact.phone_e164, body: "Hola prueba" }.to_json,
           headers: auth_headers(admin)

      expect(response).to have_http_status(:accepted)
      attrs = json["data"]["attributes"]
      expect(attrs["from_number"]).to eq("+5731999999999")
      expect(attrs["direction"]).to eq("out")
    end

    it "responde 422 con código si no hay número ni integración" do
      twilio_integration.destroy!

      post "/api/v1/opportunities/#{opportunity.id}/whatsapp_messages",
           params:  { to_number: contact.phone_e164, body: "Hola" }.to_json,
           headers: auth_headers(admin)

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["error"]).to eq("whatsapp_not_configured")
    end

    it "con whatsapp_template_id envía plantilla en vez de texto libre" do
      allow(WhatsappDeliveryJob).to receive(:perform_now)
      template = create(:whatsapp_template, tenant: tenant, meta_template_name: "primer_contacto", language: "es_CO",
                                             variable_labels: ["Nombre"])

      post "/api/v1/opportunities/#{opportunity.id}/whatsapp_messages",
           params:  {
             to_number: contact.phone_e164, whatsapp_template_id: template.id, template_params: ["Oscar"]
           }.to_json,
           headers: auth_headers(admin)

      expect(response).to have_http_status(:accepted)
      attrs = json["data"]["attributes"]
      expect(attrs["message_type"]).to eq("template")
      expect(attrs["template_name"]).to eq("primer_contacto")
      expect(attrs["template_language"]).to eq("es_CO")
      expect(attrs["template_params"]).to eq(["Oscar"])
      expect(attrs["body"]).to be_nil
    end

    it "404 si el whatsapp_template_id no existe en el catálogo del tenant" do
      post "/api/v1/opportunities/#{opportunity.id}/whatsapp_messages",
           params:  { to_number: contact.phone_e164, whatsapp_template_id: 0 }.to_json,
           headers: auth_headers(admin)

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "GET /api/v1/whatsapp_messages?contact_id=" do
    it "filtra el hilo completo por contacto (usado por el inbox)" do
      other_contact = create(:contact, tenant: tenant)
      mine = create(:whatsapp_message, tenant: tenant, contact: contact, direction: "in")
      create(:whatsapp_message, tenant: tenant, contact: other_contact, direction: "in")

      get "/api/v1/whatsapp_messages", params: { contact_id: contact.id }, headers: auth_headers(admin)

      expect(response).to have_http_status(:ok)
      ids = json["data"].map { |d| d["id"].to_i }
      expect(ids).to eq([mine.id])
    end
  end
end
