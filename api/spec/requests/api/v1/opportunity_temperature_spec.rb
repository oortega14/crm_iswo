# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Opportunity temperature", type: :request do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let(:pipeline)   { create(:pipeline_with_stages, tenant: tenant) }
  let(:stage)      { pipeline.pipeline_stages.first }
  let(:contact)    { create(:contact, tenant: tenant) }

  let(:bant_data_hot) do
    {
      "bant_data" => {
        "budget"    => { "score" => 75 },
        "authority" => { "score" => 75 },
        "need"      => { "score" => 75 },
        "timeline"  => { "score" => 75 }
      }
    }
  end

  let!(:own_opp) do
    create(:opportunity, :skip_bant_recalc,
           tenant: tenant,
           pipeline: pipeline,
           pipeline_stage: stage,
           contact: contact,
           owner_user: consultant,
           title: "Propia",
           temperature: "cold",
           custom_fields: bant_data_hot,
           bant_score: 75,
           last_activity_at: 2.days.ago)
  end

  around do |example|
    @orig_anthropic_key = ENV["ANTHROPIC_API_KEY"]
    ENV["ANTHROPIC_API_KEY"] = ""
    example.run
  ensure
    ENV["ANTHROPIC_API_KEY"] = @orig_anthropic_key
  end

  describe "POST /api/v1/opportunities/:id/sync_temperature" do
    it "consultant recalcula temperatura por reglas en opp propia" do
      expect do
        post "/api/v1/opportunities/#{own_opp.id}/sync_temperature",
             headers: auth_headers(consultant)
      end.to change { own_opp.opportunity_logs.where(action: "classify").count }.by(1)

      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "attributes", "temperature")).to eq("hot")
      expect(json.dig("ai_result", "temperature")).to eq("hot")
      expect(json.dig("ai_result", "ai_used")).to be(false)
      expect(json.dig("ai_result", "reasoning")).to be_present
      expect(json.dig("ai_result", "next_action")).to be_present
      expect(own_opp.reload.temperature).to eq("hot")
    end
  end

  describe "POST /api/v1/opportunities/:id/classify" do
    it "consultant clasifica opp propia sin API key de Anthropic" do
      expect do
        post "/api/v1/opportunities/#{own_opp.id}/classify",
             headers: auth_headers(consultant)
      end.to change { own_opp.opportunity_logs.where(action: "classify").count }.by(1)

      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "attributes", "temperature")).to eq("hot")
      expect(json.dig("ai_result", "temperature")).to eq("hot")
      expect(json.dig("ai_result", "ai_used")).to be(false)
      expect(json.dig("ai_result", "fallback_reason")).to eq("missing_api_key")
      expect(json.dig("meta", "ai_used")).to be(false)
      expect(json.dig("meta", "claude_configured")).to be(false)
      expect(own_opp.reload.temperature).to eq("hot")
    end
  end
end
