# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Webhooks::OpenWa", type: :request do
  around do |example|
    original = ENV["OPENWA_WEBHOOK_SECRET"]
    example.run
  ensure
    original ? (ENV["OPENWA_WEBHOOK_SECRET"] = original) : ENV.delete("OPENWA_WEBHOOK_SECRET")
  end

  let(:payload) do
    {
      event:     "message.received",
      sessionId: "my-session",
      data: {
        id:   { _serialized: "OWID001" },
        from: "573001234567@c.us",
        to:   "573009999999@c.us",
        body: "Hola"
      }
    }
  end

  describe "POST /api/v1/webhooks/whatsapp/openwa" do
    it "procesa WebhookProcessorJob inline con 'whatsapp_openwa' (sin secret → dev)" do
      ENV.delete("OPENWA_WEBHOOK_SECRET")

      expect(WebhookProcessorJob).to receive(:perform_now).with(
        "whatsapp_openwa",
        hash_including("event" => "message.received", "received_at" => kind_of(String))
      )

      post "/api/v1/webhooks/whatsapp/openwa",
           params:  payload.to_json,
           headers: { "Content-Type" => "application/json" }

      expect(response).to have_http_status(:ok)
    end

    it "400 si el body no es JSON válido" do
      ENV.delete("OPENWA_WEBHOOK_SECRET")

      post "/api/v1/webhooks/whatsapp/openwa",
           params:  "not-json",
           headers: { "Content-Type" => "application/json" }

      expect(response).to have_http_status(:bad_request)
    end

    context "con OPENWA_WEBHOOK_SECRET configurado" do
      let(:secret) { "openwa-test-secret" }
      let(:raw)    { payload.to_json }
      let(:sig)    { OpenSSL::HMAC.hexdigest("SHA256", secret, raw) }

      before { ENV["OPENWA_WEBHOOK_SECRET"] = secret }

      it "acepta con firma X-OpenWA-Signature válida" do
        expect(WebhookProcessorJob).to receive(:perform_now)

        post "/api/v1/webhooks/whatsapp/openwa",
             params:  raw,
             headers: { "Content-Type" => "application/json", "X-OpenWA-Signature" => sig }

        expect(response).to have_http_status(:ok)
      end

      it "rechaza con firma inválida (403)" do
        expect(WebhookProcessorJob).not_to receive(:perform_now)

        post "/api/v1/webhooks/whatsapp/openwa",
             params:  raw,
             headers: { "Content-Type" => "application/json", "X-OpenWA-Signature" => "badfirma" }

        expect(response).to have_http_status(:forbidden)
      end

      it "rechaza sin header de firma (403)" do
        expect(WebhookProcessorJob).not_to receive(:perform_now)

        post "/api/v1/webhooks/whatsapp/openwa",
             params:  raw,
             headers: { "Content-Type" => "application/json" }

        expect(response).to have_http_status(:forbidden)
      end
    end
  end
end
