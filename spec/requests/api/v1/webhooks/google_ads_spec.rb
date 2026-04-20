# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Webhooks::GoogleAds", type: :request do
  around do |example|
    original = ENV["GOOGLE_ADS_WEBHOOK_KEY"]
    example.run
  ensure
    if original.nil?
      ENV.delete("GOOGLE_ADS_WEBHOOK_KEY")
    else
      ENV["GOOGLE_ADS_WEBHOOK_KEY"] = original
    end
  end

  let(:payload) do
    {
      lead: {
        email: "lead@example.com",
        full_name: "Nuevo Lead",
        phone_number: "+573001234567"
      }
    }
  end

  describe "POST /api/v1/webhooks/google" do
    context "sin clave configurada (dev)" do
      it "acepta y encola WebhookProcessorJob" do
        ENV.delete("GOOGLE_ADS_WEBHOOK_KEY")

        expect(WebhookProcessorJob).to receive(:perform_later).with(
          "google_ads",
          hash_including("received_at" => kind_of(String))
        )

        post "/api/v1/webhooks/google",
             params: payload.to_json,
             headers: { "Content-Type" => "application/json" }

        expect(response).to have_http_status(:ok)
      end
    end

    context "con clave configurada" do
      before { ENV["GOOGLE_ADS_WEBHOOK_KEY"] = "valid-key" }

      it "acepta cuando ?key= coincide" do
        expect(WebhookProcessorJob).to receive(:perform_later)
        post "/api/v1/webhooks/google?key=valid-key",
             params: payload.to_json,
             headers: { "Content-Type" => "application/json" }
        expect(response).to have_http_status(:ok)
      end

      it "rechaza con clave incorrecta (403)" do
        expect(WebhookProcessorJob).not_to receive(:perform_later)
        post "/api/v1/webhooks/google?key=wrong",
             params: payload.to_json,
             headers: { "Content-Type" => "application/json" }
        expect(response).to have_http_status(:forbidden)
      end
    end

    it "400 si el body no es JSON válido" do
      post "/api/v1/webhooks/google",
           params: "bad-json",
           headers: { "Content-Type" => "application/json" }
      expect(response).to have_http_status(:bad_request)
    end
  end
end
