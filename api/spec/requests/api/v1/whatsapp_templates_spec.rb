# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::WhatsappTemplates", type: :request do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:admin)      { create(:user, :admin,      tenant: tenant) }
  let(:manager)    { create(:user, :manager,    tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let!(:template)  { create(:whatsapp_template, tenant: tenant, name: "Primer contacto", meta_template_name: "primer_contacto") }

  describe "GET /api/v1/whatsapp_templates" do
    it "200 con lista, visible para consultant" do
      get "/api/v1/whatsapp_templates", headers: auth_headers(consultant)
      expect(response).to have_http_status(:ok)
      ids = json["data"].map { |d| d["id"].to_i }
      expect(ids).to include(template.id)
    end

    it "filtra por ?active=true" do
      inactive = create(:whatsapp_template, tenant: tenant, active: false, meta_template_name: "inactiva")
      get "/api/v1/whatsapp_templates?active=true", headers: auth_headers(admin)
      ids = json["data"].map { |d| d["id"].to_i }
      expect(ids).not_to include(inactive.id)
    end
  end

  describe "POST /api/v1/whatsapp_templates" do
    it "admin crea plantilla" do
      post "/api/v1/whatsapp_templates",
           headers: auth_headers(admin),
           params: { whatsapp_template: {
             name: "Bienvenida", meta_template_name: "bienvenida", language: "es_CO", variable_labels: ["Nombre"]
           } }.to_json
      expect(response).to have_http_status(:created)
      expect(json.dig("data", "attributes", "meta_template_name")).to eq("bienvenida")
      expect(json.dig("data", "attributes", "variable_labels")).to eq(["Nombre"])
    end

    it "consultant no puede crear" do
      post "/api/v1/whatsapp_templates",
           headers: auth_headers(consultant),
           params: { whatsapp_template: { name: "X", meta_template_name: "x", language: "es_CO" } }.to_json
      expect(response).to have_http_status(:forbidden)
    end

    it "422 con datos inválidos" do
      post "/api/v1/whatsapp_templates",
           headers: auth_headers(admin),
           params: { whatsapp_template: { name: "", meta_template_name: "x", language: "es_CO" } }.to_json
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PATCH /api/v1/whatsapp_templates/:id" do
    it "manager actualiza plantilla" do
      patch "/api/v1/whatsapp_templates/#{template.id}",
            headers: auth_headers(manager),
            params: { whatsapp_template: { active: false } }.to_json
      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "attributes", "active")).to be(false)
    end
  end

  describe "DELETE /api/v1/whatsapp_templates/:id" do
    it "admin elimina plantilla" do
      delete "/api/v1/whatsapp_templates/#{template.id}", headers: auth_headers(admin)
      expect(response).to have_http_status(:no_content)
    end

    it "manager no puede eliminar" do
      delete "/api/v1/whatsapp_templates/#{template.id}", headers: auth_headers(manager)
      expect(response).to have_http_status(:forbidden)
    end
  end
end
