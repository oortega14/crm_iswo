# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::AdIntegrations", type: :request do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:admin) { create(:user, :admin, tenant: tenant) }
  let(:manager) { create(:user, :manager, tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }

  describe "GET /api/v1/ad_integrations" do
    it "200 JSON:API para admin" do
      create(:ad_integration, :meta, tenant: tenant)

      get "/api/v1/ad_integrations", headers: auth_headers(admin)

      expect(response).to have_http_status(:ok)
      expect(json["data"]).to be_a(Array)
      expect(json["data"].first.dig("attributes", "provider")).to eq("meta")
      wh = json.dig("meta", "integration_webhooks")
      expect(wh).to be_a(Hash)
      expect(wh["meta_leads_post"]).to end_with("/api/v1/webhooks/meta")
      expect(wh["google_leads_post"]).to end_with("/api/v1/webhooks/google")
    end

    it "200 para manager" do
      get "/api/v1/ad_integrations", headers: auth_headers(manager)
      expect(response).to have_http_status(:ok)
    end

    it "403 para consultant (index restringido a manager/admin)" do
      get "/api/v1/ad_integrations", headers: auth_headers(consultant)
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "PATCH /api/v1/ad_integrations/:id" do
    let!(:integration) { create(:ad_integration, :google, tenant: tenant, metadata: { "form_id" => "old" }) }

    it "fusiona metadata sin to_unsafe_h sobre Hash" do
      body = {
        ad_integration: {
          metadata: { "form_id" => "new-form" }
        }
      }

      patch "/api/v1/ad_integrations/#{integration.id}",
            params: body.to_json,
            headers: auth_headers(admin)

      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "attributes", "metadata", "form_id")).to eq("new-form")
    end
  end
end
