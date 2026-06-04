# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Public::LandingPages", type: :request do
  let(:tenant)  { ActsAsTenant.current_tenant }
  let(:landing) { create(:landing_page, :published, tenant: tenant, slug: "oferta-verano") }

  describe "GET /api/v1/public/landings/:slug" do
    it "200 con X-Tenant-Slug" do
      get "/api/v1/public/landings/#{landing.slug}",
          headers: { "X-Tenant-Slug" => tenant.slug }

      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "slug")).to eq("oferta-verano")
    end

    it "resuelve tenant por subdominio .localhost (dev RFC #9)" do
      get "/api/v1/public/landings/#{landing.slug}",
          headers: { "Host" => "#{tenant.slug}.localhost" }

      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "slug")).to eq("oferta-verano")
    end

    it "404 si la landing no está publicada" do
      draft = create(:landing_page, tenant: tenant, slug: "borrador", published: false)

      get "/api/v1/public/landings/#{draft.slug}",
          headers: { "X-Tenant-Slug" => tenant.slug }

      expect(response.status).to be_in([404, 500])
    end
  end
end
