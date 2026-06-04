# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Pipelines", type: :request do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:admin)      { create(:user, :admin,      tenant: tenant) }
  let(:manager)    { create(:user, :manager,    tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let!(:pipeline)  { create(:pipeline, tenant: tenant, name: "Principal", is_default: true) }

  describe "GET /api/v1/pipelines" do
    it "200 con lista de pipelines" do
      get "/api/v1/pipelines", headers: auth_headers(consultant)
      expect(response).to have_http_status(:ok)
      ids = json["data"].map { |d| d["id"].to_i }
      expect(ids).to include(pipeline.id)
    end
  end

  describe "POST /api/v1/pipelines" do
    it "admin crea pipeline" do
      post "/api/v1/pipelines",
           headers: auth_headers(admin),
           params: { pipeline: { name: "Nuevo", is_default: false } }.to_json
      expect(response).to have_http_status(:created)
      expect(json.dig("data", "attributes", "name")).to eq("Nuevo")
    end

    it "al crear is_default=true quita el default anterior" do
      post "/api/v1/pipelines",
           headers: auth_headers(admin),
           params: { pipeline: { name: "Nuevo Default", is_default: true } }.to_json
      expect(response).to have_http_status(:created)
      expect(pipeline.reload.is_default).to be(false)
    end

    it "consultant no puede crear" do
      post "/api/v1/pipelines",
           headers: auth_headers(consultant),
           params: { pipeline: { name: "X" } }.to_json
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "PATCH /api/v1/pipelines/:id" do
    it "manager actualiza pipeline" do
      patch "/api/v1/pipelines/#{pipeline.id}",
            headers: auth_headers(manager),
            params: { pipeline: { name: "Renombrado" } }.to_json
      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "attributes", "name")).to eq("Renombrado")
    end
  end

  describe "DELETE /api/v1/pipelines/:id" do
    it "admin elimina pipeline" do
      p2 = create(:pipeline, tenant: tenant, name: "Secundario")
      delete "/api/v1/pipelines/#{p2.id}", headers: auth_headers(admin)
      expect(response).to have_http_status(:no_content)
    end

    it "manager no puede eliminar" do
      delete "/api/v1/pipelines/#{pipeline.id}", headers: auth_headers(manager)
      expect(response).to have_http_status(:forbidden)
    end
  end
end
