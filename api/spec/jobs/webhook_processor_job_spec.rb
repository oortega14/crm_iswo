# frozen_string_literal: true

require "rails_helper"

RSpec.describe WebhookProcessorJob, type: :job do
  describe "whatsapp_twilio" do
    let(:tenant) { ActsAsTenant.current_tenant }
    let(:contact) { create(:contact, tenant: tenant) }

    it "actualiza el estado del mensaje saliente con el callback de Twilio" do
      msg = create(
        :whatsapp_message,
        tenant: tenant,
        contact: contact,
        direction: :out,
        provider_message_id: "SMstatus1",
        status: "queued",
        sent_at: nil,
        delivered_at: nil
      )

      payload = {
        "MessageSid" => "SMstatus1",
        "MessageStatus" => "delivered",
        "SmsStatus" => "delivered"
      }

      described_class.new.perform("whatsapp_twilio", payload)

      expect(msg.reload.status).to eq("delivered")
      expect(msg.delivered_at).to be_present
    end

    it "registra fallo cuando Twilio devuelve undelivered" do
      msg = create(
        :whatsapp_message,
        tenant: tenant,
        contact: contact,
        direction: :out,
        provider_message_id: "SMbad",
        status: "sent"
      )

      payload = {
        "MessageSid" => "SMbad",
        "MessageStatus" => "undelivered",
        "SmsStatus" => "undelivered",
        "ErrorCode" => "63016",
        "ErrorMessage" => "Template mismatch"
      }

      described_class.new.perform("whatsapp_twilio", payload)

      msg.reload
      expect(msg.status).to eq("failed")
      expect(msg.error_message).to match(/63016|Template mismatch/)
    end

    context "mensaje entrante", :without_tenant do
      it "persiste inbound con estado delivered e integración Twilio" do
        t = create(:tenant)
        ActsAsTenant.with_tenant(t) do
          create(
            :ad_integration,
            :twilio,
            tenant: t,
            account_identifier: "+15559876543"
          )
        end
        payload = {
          "From" => "whatsapp:+573001234567",
          "To" => "whatsapp:+15559876543",
          "Body" => "hola equipo",
          "MessageSid" => "SMin1"
        }

        described_class.new.perform("whatsapp_twilio", payload)

        inbound = ActsAsTenant.with_tenant(t) do
          WhatsappMessage.find_by(provider_message_id: "SMin1")
        end

        expect(inbound).to be_present
        expect(inbound.status).to eq("delivered")
        expect(inbound.direction).to eq("in")
      end
    end
  end

  describe "whatsapp_cloud" do
    let(:tenant) { ActsAsTenant.current_tenant }
    let(:contact) { create(:contact, tenant: tenant) }

    it "actualiza estado saliente con statuses[] de Meta" do
      ActsAsTenant.with_tenant(tenant) do
        create(
          :ad_integration,
          :cloud,
          tenant: tenant,
          account_identifier: "109876543210"
        )
      end

      msg = create(
        :whatsapp_message,
        :cloud,
        tenant: tenant,
        contact: contact,
        direction: :out,
        provider_message_id: "wamid.STATUS123",
        status: "sent"
      )

      payload = {
        "entry" => [
          {
            "changes" => [
              {
                "value" => {
                  "metadata" => { "phone_number_id" => "109876543210" },
                  "statuses" => [
                    { "id" => "wamid.STATUS123", "status" => "delivered", "timestamp" => "1234567890" }
                  ]
                }
              }
            ]
          }
        ]
      }

      described_class.new.perform("whatsapp_cloud", payload)

      expect(msg.reload.status).to eq("delivered")
      expect(msg.delivered_at).to be_present
    end

    context "mensaje entrante", :without_tenant do
      it "persiste payload estilo Meta (text, contacts.profile, display_phone_number)" do
        t = create(:tenant)
        ActsAsTenant.with_tenant(t) do
          create(:ad_integration, :cloud, tenant: t, account_identifier: "7794189252778687")
        end

        wamid = "wamid.HBgLMTc4NjM1NTk5NjYVAGISEE"
        payload = {
          "object" => "whatsapp_business_account",
          "entry" => [
            {
              "id" => "215589313241560883",
              "changes" => [
                {
                  "field" => "messages",
                  "value" => {
                    "messaging_product" => "whatsapp",
                    "metadata" => {
                      "display_phone_number" => "15551797781",
                      "phone_number_id" => "7794189252778687"
                    },
                    "contacts" => [
                      {
                        "profile" => { "name" => "Jessica Laverdetman" },
                        "wa_id" => "17863559966"
                      }
                    ],
                    "messages" => [
                      {
                        "from" => "17863559966",
                        "id" => wamid,
                        "timestamp" => "1758254144",
                        "text" => { "body" => "Hi!" },
                        "type" => "text"
                      }
                    ]
                  }
                }
              ]
            }
          ]
        }

        described_class.new.perform("whatsapp_cloud", payload)

        ActsAsTenant.with_tenant(t) do
          inbound = WhatsappMessage.find_by(provider_message_id: wamid)
          expect(inbound).to be_present
          expect(inbound.body).to eq("Hi!")
          expect(inbound.direction).to eq("in")
          expect(inbound.to_number).to eq("+15551797781")
          expect(inbound.contact.first_name).to eq("Jessica")
          expect(inbound.contact.last_name).to eq("Laverdetman")
        end
      end
    end
  end
end
