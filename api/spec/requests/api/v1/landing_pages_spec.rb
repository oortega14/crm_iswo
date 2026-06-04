# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::LandingPages", type: :request do
  let(:tenant)  { ActsAsTenant.current_tenant }
  let(:admin)   { create(:user, :admin,   tenant: tenant) }
  let(:manager) { create(:user, :manager, tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let!(:landing) { create(:landing_page, tenant: tenant, title: "Landing Principal", slug: "principal") }

  describe "GET /api/v1/landing_pages" do
    it "200 con lista de landings" do
      get "/api/v1/landing_pages", headers: auth_headers(admin)
      expect(response).to have_http_status(:ok)
      ids = json["data"].map { |d| d["id"].to_i }
      expect(ids).to include(landing.id)
    end

    it "filtra published=true" do
      unpublished = create(:landing_page, tenant: tenant, title: "Borrador", slug: "borrador", published: false)
      get "/api/v1/landing_pages?published=true", headers: auth_headers(admin)
      ids = json["data"].map { |d| d["id"].to_i }
      expect(ids).not_to include(unpublished.id)
    end
  end

  describe "GET /api/v1/landing_pages/:id" do
    it "200 con contenido (include_content)" do
      get "/api/v1/landing_pages/#{landing.id}", headers: auth_headers(admin)
      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "attributes", "title")).to eq("Landing Principal")
    end
  end

  describe "POST /api/v1/landing_pages" do
    it "admin crea landing" do
      post "/api/v1/landing_pages",
           headers: auth_headers(admin),
           params: { landing_page: { title: "Nueva Landing", slug: "nueva-landing" } }.to_json
      expect(response).to have_http_status(:created)
      expect(json.dig("data", "attributes", "slug")).to eq("nueva-landing")
    end

    it "consultant no puede crear" do
      post "/api/v1/landing_pages",
           headers: auth_headers(consultant),
           params: { landing_page: { title: "X", slug: "x" } }.to_json
      expect(response).to have_http_status(:forbidden)
    end

    it "422 con slug duplicado" do
      post "/api/v1/landing_pages",
           headers: auth_headers(admin),
           params: { landing_page: { title: "Dup", slug: "principal" } }.to_json
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "POST /api/v1/landing_pages/:id/publish + unpublish" do
    it "publica y despublica una landing" do
      post "/api/v1/landing_pages/#{landing.id}/publish", headers: auth_headers(admin)
      expect(response).to have_http_status(:ok)
      expect(landing.reload.published).to be(true)

      post "/api/v1/landing_pages/#{landing.id}/unpublish", headers: auth_headers(admin)
      expect(response).to have_http_status(:ok)
      expect(landing.reload.published).to be(false)
    end
  end

  describe "POST /api/v1/landing_pages/:id/duplicate" do
    it "crea una copia despublicada" do
      post "/api/v1/landing_pages/#{landing.id}/duplicate", headers: auth_headers(admin)
      expect(response).to have_http_status(:created)
      copy_title = json.dig("data", "attributes", "title")
      expect(copy_title).to include("copia")
      expect(json.dig("data", "attributes", "published")).to be(false)
    end
  end

  describe "GET /api/v1/landing_pages/:id/metrics" do
    it "devuelve métricas de conversión" do
      get "/api/v1/landing_pages/#{landing.id}/metrics?days=30", headers: auth_headers(admin)
      expect(response).to have_http_status(:ok)
      data = json["data"]
      expect(data).to include("view_count", "lead_count", "conversion_rate",
                              "period_days", "daily_leads", "top_utm_sources")
      expect(data["period_days"]).to eq(30)
    end
  end

  describe "DELETE /api/v1/landing_pages/:id" do
    it "admin elimina landing" do
      delete "/api/v1/landing_pages/#{landing.id}", headers: auth_headers(admin)
      expect(response).to have_http_status(:no_content)
    end

    it "manager no puede eliminar" do
      delete "/api/v1/landing_pages/#{landing.id}", headers: auth_headers(manager)
      expect(response).to have_http_status(:forbidden)
    end
  end
end
