# frozen_string_literal: true

require "rails_helper"

RSpec.describe WhatsApp::Adapters::Twilio do
  let(:tenant) do
    t = ActsAsTenant.current_tenant
    t.update!(settings: {
                "whatsapp" => {
                  "twilio_account_sid" => "ACxxx",
                  "twilio_auth_token"  => "tokenxyz",
                  "twilio_from"        => "+573000000000"
                }
              })
    t
  end
  let(:adapter) { described_class.new(tenant: tenant) }
  let(:message) do
    create(:whatsapp_message, :outbound, :twilio,
           tenant: tenant, from_number: "+573000000000", to_number: "+573001112233",
           body: "Hola")
  end

  let(:endpoint) { "https://api.twilio.com/2010-04-01/Accounts/ACxxx/Messages.json" }

  describe "#deliver" do
    it "envía POST con auth Basic y prefijo whatsapp:" do
      stub = stub_request(:post, endpoint)
             .with(
               headers: { "Authorization" => "Basic #{Base64.strict_encode64('ACxxx:tokenxyz')}" },
               body:    hash_including("From" => "whatsapp:+573000000000",
                                       "To"   => "whatsapp:+573001112233",
                                       "Body" => "Hola")
             )
             .to_return(status: 201, body: { sid: "SMabc123", status: "queued" }.to_json,
                        headers: { "Content-Type" => "application/json" })

      result = adapter.deliver(message)

      expect(stub).to have_been_requested
      expect(result).to eq(provider_message_id: "SMabc123", status: "queued")
    end

    it "agrega MediaUrl si está presente" do
      message.update!(media_url: "https://cdn.example.com/img.png")
      stub = stub_request(:post, endpoint)
             .with(body: hash_including("MediaUrl" => "https://cdn.example.com/img.png"))
             .to_return(status: 201, body: { sid: "SMx", status: "sent" }.to_json,
                        headers: { "Content-Type" => "application/json" })

      adapter.deliver(message)
      expect(stub).to have_been_requested
    end

    it "mapea status 'undelivered' del proveedor a 'failed'" do
      stub_request(:post, endpoint).to_return(
        status: 201,
        body:   { sid: "SMx", status: "undelivered" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      result = adapter.deliver(message)
      expect(result[:status]).to eq("failed")
    end

    it "eleva DeliveryError ante 4xx con mensaje del proveedor" do
      stub_request(:post, endpoint).to_return(
        status: 400,
        body:   { code: 21211, message: "Invalid 'To'" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      expect { adapter.deliver(message) }
        .to raise_error(WhatsApp::MessageSender::DeliveryError, /Invalid 'To'/)
    end

    context "credenciales incompletas" do
      it "eleva DeliveryError si falta el SID" do
        tenant.update!(settings: { "whatsapp" => { "twilio_auth_token" => "x" } })
        # Limpia ENV para evitar fallback inesperado
        stub_const("ENV", ENV.to_h.merge("TWILIO_ACCOUNT_SID" => nil, "TWILIO_AUTH_TOKEN" => nil))
        expect { adapter.deliver(message) }
          .to raise_error(WhatsApp::MessageSender::DeliveryError, /Credenciales Twilio/)
      end
    end
  end
end
