# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::LeadSources", type: :request do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:admin)      { create(:user, :admin,      tenant: tenant) }
  let(:manager)    { create(:user, :manager,    tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let!(:source)    { create(:lead_source, tenant: tenant, name: "Web Orgánico", kind: "web") }

  describe "GET /api/v1/lead_sources" do
    it "200 con lista" do
      get "/api/v1/lead_sources", headers: auth_headers(consultant)
      expect(response).to have_http_status(:ok)
      ids = json["data"].map { |d| d["id"].to_i }
      expect(ids).to include(source.id)
    end

    it "filtra por ?active=true" do
      inactive = create(:lead_source, tenant: tenant, name: "Inactivo", kind: "meta", active: false)
      get "/api/v1/lead_sources?active=true", headers: auth_headers(admin)
      ids = json["data"].map { |d| d["id"].to_i }
      expect(ids).not_to include(inactive.id)
    end
  end

  describe "POST /api/v1/lead_sources" do
    it "admin crea source" do
      post "/api/v1/lead_sources",
           headers: auth_headers(admin),
           params: { lead_source: { name: "Referido", kind: "referral" } }.to_json
      expect(response).to have_http_status(:created)
      expect(json.dig("data", "attributes", "name")).to eq("Referido")
    end

    it "consultant no puede crear" do
      post "/api/v1/lead_sources",
           headers: auth_headers(consultant),
           params: { lead_source: { name: "X", kind: "web" } }.to_json
      expect(response).to have_http_status(:forbidden)
    end

    it "422 con datos inválidos" do
      post "/api/v1/lead_sources",
           headers: auth_headers(admin),
           params: { lead_source: { name: "", kind: "web" } }.to_json
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PATCH /api/v1/lead_sources/:id" do
    it "manager actualiza source" do
      patch "/api/v1/lead_sources/#{source.id}",
            headers: auth_headers(manager),
            params: { lead_source: { name: "Web Actualizado" } }.to_json
      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "attributes", "name")).to eq("Web Actualizado")
    end
  end

  describe "DELETE /api/v1/lead_sources/:id" do
    it "admin elimina source" do
      delete "/api/v1/lead_sources/#{source.id}", headers: auth_headers(admin)
      expect(response).to have_http_status(:no_content)
    end

    it "manager no puede eliminar" do
      delete "/api/v1/lead_sources/#{source.id}", headers: auth_headers(manager)
      expect(response).to have_http_status(:forbidden)
    end
  end
end
