# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Opportunity temperature", type: :request do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let(:pipeline)   { create(:pipeline_with_stages, tenant: tenant) }
  let(:stage)      { pipeline.pipeline_stages.first }
  let(:contact)    { create(:contact, tenant: tenant) }

  let!(:own_opp) do
    create(:opportunity, :skip_bant_recalc,
           tenant: tenant, pipeline: pipeline, pipeline_stage: stage,
           contact: contact, owner_user: consultant, title: "Propia")
  end

  describe "POST /api/v1/opportunities/:id/sync_temperature" do
    it "recalculates temperature for an owned opportunity" do
      post "/api/v1/opportunities/#{own_opp.id}/sync_temperature",
           headers: auth_headers(consultant)

      expect(response).to have_http_status(:ok)
      expect(json.dig("ai_result", "temperature")).to be_in(%w[cold warm hot])
      expect(json.dig("ai_result", "reasoning")).to be_present
    end
  end

  describe "POST /api/v1/opportunities/:id/classify" do
    it "classifies temperature for an owned opportunity" do
      post "/api/v1/opportunities/#{own_opp.id}/classify",
           headers: auth_headers(consultant)

      expect(response).to have_http_status(:ok)
      expect(json.dig("ai_result", "temperature")).to be_in(%w[cold warm hot])
      expect(json.dig("ai_result", "reasoning")).to be_present
    end
  end
end
