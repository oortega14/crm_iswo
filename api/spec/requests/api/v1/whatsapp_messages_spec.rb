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

  describe "POST /api/v1/opportunities/:opportunity_id/whatsapp_messages" do
    it "usa el número de la integración Twilio como remitente y acepta el mensaje" do
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
  end
end
