# frozen_string_literal: true

require "rails_helper"

RSpec.describe WhatsApp::Adapters::OpenWa do
  let(:tenant) do
    t = ActsAsTenant.current_tenant
    t.update!(settings: {
                "whatsapp" => {
                  "openwa_url"        => "http://openwa.local",
                  "openwa_api_key"    => "secret-key",
                  "openwa_session_id" => "my-session"
                }
              })
    t
  end
  let(:adapter) { described_class.new(tenant: tenant) }
  let(:message) do
    create(:whatsapp_message, :outbound, :openwa,
           tenant: tenant, to_number: "+573001112233", body: "Hola desde OpenWA")
  end

  let(:endpoint) { "http://openwa.local/api/sessions/my-session/messages/send-text" }

  describe "#deliver" do
    it "envía POST con X-API-Key y chatId en formato @c.us" do
      stub = stub_request(:post, endpoint)
             .with(
               headers: { "X-API-Key" => "secret-key" },
               body:    hash_including("chatId" => "573001112233@c.us", "text" => "Hola desde OpenWA")
             )
             .to_return(
               status: 200,
               body:   { id: { _serialized: "OWID123_serialized" }, status: "sent" }.to_json,
               headers: { "Content-Type" => "application/json" }
             )

      result = adapter.deliver(message)

      expect(stub).to have_been_requested
      expect(result[:provider_message_id]).to eq("OWID123_serialized")
      expect(result[:status]).to eq("sent")
    end

    it "extrae el id cuando es un string plano (no objeto anidado)" do
      stub_request(:post, endpoint).to_return(
        status:  200,
        body:    { id: "OWID_plain", status: "sent" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      result = adapter.deliver(message)
      expect(result[:provider_message_id]).to eq("OWID_plain")
    end

    it "convierte E.164 con prefijo + a chatId sin + y con @c.us" do
      stub = stub_request(:post, endpoint)
             .with(body: hash_including("chatId" => "573001112233@c.us"))
             .to_return(status: 200, body: { id: "x" }.to_json,
                        headers: { "Content-Type" => "application/json" })

      adapter.deliver(message)
      expect(stub).to have_been_requested
    end

    it "eleva DeliveryError ante respuesta 4xx" do
      stub_request(:post, endpoint).to_return(
        status:  400,
        body:    { message: "Session not found" }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

      expect { adapter.deliver(message) }
        .to raise_error(WhatsApp::MessageSender::DeliveryError, /OpenWA.*Session not found/)
    end

    it "eleva DeliveryError ante respuesta 500" do
      stub_request(:post, endpoint).to_return(status: 500, body: "Internal error")

      expect { adapter.deliver(message) }
        .to raise_error(WhatsApp::MessageSender::DeliveryError, /OpenWA.*HTTP 500/)
    end

    context "credenciales incompletas" do
      it "eleva DeliveryError si falta la URL" do
        tenant.update!(settings: {
                         "whatsapp" => { "openwa_api_key" => "k", "openwa_session_id" => "s" }
                       })
        stub_const("ENV", ENV.to_h.merge("OPENWA_URL" => nil, "OPENWA_API_KEY" => nil,
                                          "OPENWA_SESSION_ID" => nil))
        expect { adapter.deliver(message) }
          .to raise_error(WhatsApp::MessageSender::DeliveryError, /Credenciales OpenWA incompletas/)
      end

      it "eleva DeliveryError si falta el session_id" do
        tenant.update!(settings: {
                         "whatsapp" => { "openwa_url" => "http://x", "openwa_api_key" => "k" }
                       })
        stub_const("ENV", ENV.to_h.merge("OPENWA_URL" => nil, "OPENWA_API_KEY" => nil,
                                          "OPENWA_SESSION_ID" => nil))
        expect { adapter.deliver(message) }
          .to raise_error(WhatsApp::MessageSender::DeliveryError, /Credenciales OpenWA incompletas/)
      end
    end

    context "credenciales desde AdIntegration" do
      it "usa url/api_key de credentials y session_id de account_identifier" do
        tenant.update!(settings: {})
        ActsAsTenant.with_tenant(tenant) do
          create(:ad_integration, :openwa, tenant: tenant,
                 account_identifier: "integ-session",
                 credentials: { "url" => "http://integ.local", "api_key" => "integ-key" })
        end
        stub_const("ENV", ENV.to_h.merge("OPENWA_URL" => nil, "OPENWA_API_KEY" => nil,
                                          "OPENWA_SESSION_ID" => nil))

        integ_endpoint = "http://integ.local/api/sessions/integ-session/messages/send-text"
        stub = stub_request(:post, integ_endpoint)
               .with(headers: { "X-API-Key" => "integ-key" })
               .to_return(status: 200, body: { id: "ow1" }.to_json,
                          headers: { "Content-Type" => "application/json" })

        adapter.deliver(message)
        expect(stub).to have_been_requested
      end
    end
  end
end
