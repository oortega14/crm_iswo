# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::OpportunityLogs", type: :request do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:admin)      { create(:user, :admin,      tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let(:pipeline)   { create(:pipeline_with_stages, tenant: tenant) }
  let(:contact)    { create(:contact, tenant: tenant) }
  let(:opp) do
    create(:opportunity, tenant: tenant, contact: contact,
           pipeline: pipeline, pipeline_stage: pipeline.pipeline_stages.first,
           owner_user: consultant)
  end
  let!(:log) { create(:opportunity_log, tenant: tenant, opportunity: opp, action: "note") }

  describe "GET /api/v1/opportunities/:opportunity_id/logs" do
    it "200 con historial de la oportunidad" do
      get "/api/v1/opportunities/#{opp.id}/logs", headers: auth_headers(admin)
      expect(response).to have_http_status(:ok)
      ids = json["data"].map { |d| d["id"].to_i }
      expect(ids).to include(log.id)
    end

    it "consultant dueño puede ver el historial de su opp" do
      get "/api/v1/opportunities/#{opp.id}/logs", headers: auth_headers(consultant)
      expect(response).to have_http_status(:ok)
    end

    it "consultant ajeno no puede ver el historial" do
      other = create(:user, :consultant, tenant: tenant)
      get "/api/v1/opportunities/#{opp.id}/logs", headers: auth_headers(other)
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "POST /api/v1/opportunities/:opportunity_id/logs" do
    it "crea una nota en el historial" do
      post "/api/v1/opportunities/#{opp.id}/logs",
           headers: auth_headers(consultant),
           params: { note: "Llamada programada para mañana" }.to_json
      expect(response).to have_http_status(:created)
      expect(json.dig("data", "attributes", "action")).to eq("note")
      expect(json.dig("data", "attributes", "note")).to eq("Llamada programada para mañana")
    end

    it "422 si no se provee nota" do
      post "/api/v1/opportunities/#{opp.id}/logs",
           headers: auth_headers(consultant),
           params: {}.to_json
      expect(response).to have_http_status(:bad_request)
    end
  end
end
