# frozen_string_literal: true

require "rails_helper"

RSpec.describe WhatsApp::Adapters::Cloud do
  let(:tenant) do
    t = ActsAsTenant.current_tenant
    t.update!(settings: {
                "whatsapp" => {
                  "cloud_access_token"    => "EAAG...",
                  "cloud_phone_number_id" => "1111222233334444"
                }
              })
    t
  end
  let(:adapter) { described_class.new(tenant: tenant) }
  let(:message) do
    create(:whatsapp_message, :outbound, :cloud,
           tenant: tenant, to_number: "+573001112233", body: "Hola")
  end

  let(:endpoint) { "https://graph.facebook.com/v18.0/1111222233334444/messages" }

  describe "#deliver" do
    it "envía POST con Bearer token y JSON body type=text" do
      stub = stub_request(:post, endpoint)
             .with(
               headers: {
                 "Authorization" => "Bearer EAAG...",
                 "Content-Type"  => /application\/json/
               },
               body: hash_including(
                 "messaging_product" => "whatsapp",
                 "to"                => "573001112233", # sin +
                 "type"              => "text",
                 "text"              => { "body" => "Hola", "preview_url" => false }
               )
             )
             .to_return(
               status:  200,
               body:    { messaging_product: "whatsapp",
                          messages: [{ id: "wamid.HBgMSOMETHING" }] }.to_json,
               headers: { "Content-Type" => "application/json" }
             )

      result = adapter.deliver(message)

      expect(stub).to have_been_requested
      expect(result).to eq(provider_message_id: "wamid.HBgMSOMETHING", status: "sent")
    end

    it "construye payload tipo image cuando media_url es imagen" do
      message.update!(media_url: "https://cdn.example.com/banner.png")

      stub = stub_request(:post, endpoint)
             .with(body: hash_including(
               "type"  => "image",
               "image" => hash_including("link" => "https://cdn.example.com/banner.png",
                                         "caption" => "Hola")
             ))
             .to_return(status: 200,
                        body: { messages: [{ id: "wamid.Y" }] }.to_json,
                        headers: { "Content-Type" => "application/json" })

      adapter.deliver(message)
      expect(stub).to have_been_requested
    end

    it "trata PDF como document" do
      message.update!(media_url: "https://cdn.example.com/cotizacion.pdf", body: nil)

      stub = stub_request(:post, endpoint)
             .with(body: hash_including("type" => "document"))
             .to_return(status: 200,
                        body: { messages: [{ id: "wamid.Z" }] }.to_json,
                        headers: { "Content-Type" => "application/json" })

      adapter.deliver(message)
      expect(stub).to have_been_requested
    end

    it "eleva DeliveryError con code cuando Meta responde error" do
      stub_request(:post, endpoint).to_return(
        status:  400,
        body:    { error: { message: "Invalid parameter", code: 100 } }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      expect { adapter.deliver(message) }
        .to raise_error(WhatsApp::MessageSender::DeliveryError, /Invalid parameter.*code 100/)
    end

    it "eleva DeliveryError si faltan credenciales" do
      tenant.update!(settings: {})
      stub_const("ENV", ENV.to_h.merge(
                          "WHATSAPP_CLOUD_ACCESS_TOKEN" => nil,
                          "WHATSAPP_CLOUD_PHONE_NUMBER_ID" => nil
                        ))
      expect { adapter.deliver(message) }
        .to raise_error(WhatsApp::MessageSender::DeliveryError, /Credenciales WhatsApp Cloud/)
    end
  end
end
