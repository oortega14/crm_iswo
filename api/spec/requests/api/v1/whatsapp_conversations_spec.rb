# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::WhatsappConversations (inbox)", type: :request do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:admin)      { create(:user, :admin,      tenant: tenant) }
  let(:manager)    { create(:user, :manager,    tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
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

  describe "GET /api/v1/whatsapp_conversations" do
    it "agrupa por contacto, trae el último mensaje y el conteo de no leídos" do
      own_contact = create(:contact, tenant: tenant, owner_user: consultant)
      create(:whatsapp_message, tenant: tenant, contact: own_contact, direction: "in",
             body: "primero", created_at: 2.hours.ago, read_at: 1.hour.ago)
      latest = create(:whatsapp_message, tenant: tenant, contact: own_contact, direction: "in",
                       body: "segundo", created_at: 1.minute.ago)

      get "/api/v1/whatsapp_conversations", headers: auth_headers(consultant)

      expect(response).to have_http_status(:ok)
      row = json["data"].find { |d| d.dig("attributes", "contact_id") == own_contact.id.to_s }
      expect(row).not_to be_nil
      expect(row.dig("attributes", "last_message_body")).to eq(latest.body)
      expect(row.dig("attributes", "unread_count")).to eq(1)
      expect(row.dig("attributes", "bucket")).to eq("mine")
    end

    it "consultant ve la bandeja 'sin asignar' compartida (mensaje sin oportunidad ni dueño)" do
      unowned_contact = create(:contact, tenant: tenant)
      create(:whatsapp_message, tenant: tenant, contact: unowned_contact, direction: "in")

      get "/api/v1/whatsapp_conversations", params: { scope: "unassigned" }, headers: auth_headers(consultant)

      expect(response).to have_http_status(:ok)
      ids = json["data"].map { |d| d.dig("attributes", "contact_id") }
      expect(ids).to include(unowned_contact.id.to_s)
    end

    it "?scope=mine solo devuelve las conversaciones del consultor" do
      mine = create(:contact, tenant: tenant, owner_user: consultant)
      other_owner = create(:user, :consultant, tenant: tenant)
      other = create(:contact, tenant: tenant, owner_user: other_owner)
      create(:whatsapp_message, tenant: tenant, contact: mine, direction: "in")
      create(:whatsapp_message, tenant: tenant, contact: other, direction: "in")

      get "/api/v1/whatsapp_conversations", params: { scope: "mine" }, headers: auth_headers(consultant)

      ids = json["data"].map { |d| d.dig("attributes", "contact_id") }
      expect(ids).to include(mine.id.to_s)
      expect(ids).not_to include(other.id.to_s)
    end
  end

  describe "GET /api/v1/whatsapp_conversations/stats" do
    it "cuenta conversaciones con mensajes entrantes sin leer" do
      c1 = create(:contact, tenant: tenant, owner_user: admin)
      c2 = create(:contact, tenant: tenant, owner_user: admin)
      create(:whatsapp_message, tenant: tenant, contact: c1, direction: "in", read_at: nil)
      create(:whatsapp_message, tenant: tenant, contact: c2, direction: "in", read_at: Time.current)

      get "/api/v1/whatsapp_conversations/stats", headers: auth_headers(admin)

      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "unread")).to eq(1)
    end
  end

  describe "PATCH /api/v1/whatsapp_conversations/:contact_id/mark_read" do
    it "marca como leídos los mensajes entrantes del contacto y limpia la notificación" do
      contact = create(:contact, tenant: tenant, owner_user: admin)
      msg = create(:whatsapp_message, tenant: tenant, contact: contact, direction: "in", read_at: nil)
      notif = Notification.create!(tenant: tenant, user: admin, kind: "whatsapp_message_received",
                                    title: "Nuevo mensaje de WhatsApp", resource: contact)

      patch "/api/v1/whatsapp_conversations/#{contact.id}/mark_read", headers: auth_headers(admin)

      expect(response).to have_http_status(:no_content)
      expect(msg.reload.read_at).not_to be_nil
      expect(notif.reload.read_at).not_to be_nil
    end
  end

  describe "POST /api/v1/whatsapp_conversations/:contact_id/send_message" do
    before { allow(WhatsappDeliveryJob).to receive(:perform_now) }

    it "responde desde el inbox sin necesidad de una oportunidad abierta" do
      contact = create(:contact, tenant: tenant, owner_user: admin, phone_e164: "+573001234567")

      post "/api/v1/whatsapp_conversations/#{contact.id}/send_message",
           params:  { to_number: "3001234567", body: "Hola desde el inbox" }.to_json,
           headers: auth_headers(admin)

      expect(response).to have_http_status(:accepted)
      attrs = json["data"]["attributes"]
      expect(attrs["direction"]).to eq("out")
      expect(attrs["from_number"]).to eq("+5731999999999")
    end

    it "un consultor puede responder un contacto sin asignar (para reclamarlo)" do
      unowned_contact = create(:contact, tenant: tenant, phone_e164: "+573001234567")

      post "/api/v1/whatsapp_conversations/#{unowned_contact.id}/send_message",
           params:  { to_number: "3001234567", body: "Hola" }.to_json,
           headers: auth_headers(consultant)

      expect(response).to have_http_status(:accepted)
    end

    it "acepta whatsapp_template_id para iniciar conversación fuera de la ventana de 24h" do
      contact = create(:contact, tenant: tenant, owner_user: admin, phone_e164: "+573001234567")
      template = create(:whatsapp_template, tenant: tenant, meta_template_name: "primer_contacto",
                                             language: "es_CO", variable_labels: ["Nombre"])

      post "/api/v1/whatsapp_conversations/#{contact.id}/send_message",
           params:  { to_number: "3001234567", whatsapp_template_id: template.id, template_params: ["Oscar"] }.to_json,
           headers: auth_headers(admin)

      expect(response).to have_http_status(:accepted)
      attrs = json["data"]["attributes"]
      expect(attrs["message_type"]).to eq("template")
      expect(attrs["template_name"]).to eq("primer_contacto")
    end

    it "un consultor NO puede responder por el contacto de otro consultor" do
      other_owner = create(:user, :consultant, tenant: tenant)
      foreign = create(:contact, tenant: tenant, owner_user: other_owner, phone_e164: "+573001234567")

      post "/api/v1/whatsapp_conversations/#{foreign.id}/send_message",
           params:  { to_number: "3001234567", body: "Hola" }.to_json,
           headers: auth_headers(consultant)

      expect(response).to have_http_status(:not_found)
    end
  end
end
