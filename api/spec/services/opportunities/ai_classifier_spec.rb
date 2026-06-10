# frozen_string_literal: true

require "rails_helper"

RSpec.describe Opportunities::AiClassifier do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:user) { create(:user, :consultant, tenant: tenant) }
  let(:pipeline) { create(:pipeline, tenant: tenant) }
  let(:stage) { create(:pipeline_stage, pipeline: pipeline, tenant: tenant) }
  let(:contact) { create(:contact, tenant: tenant) }
  let(:opp) do
    create(:opportunity, tenant: tenant, contact: contact, pipeline: pipeline,
           pipeline_stage: stage, owner_user: user,
           custom_fields: {
             "bant_data" => {
               "budget"    => { "score" => 75 },
               "authority" => { "score" => 75 },
               "need"      => { "score" => 75 },
               "timeline"  => { "score" => 75 }
             }
           },
           last_activity_at: 2.days.ago, temperature: "cold")
  end

  around do |example|
    @orig_anthropic_key = ENV["ANTHROPIC_API_KEY"]
    example.run
  ensure
    ENV["ANTHROPIC_API_KEY"] = @orig_anthropic_key
  end

  describe ".configured?" do
    it "es false sin API key" do
      ENV["ANTHROPIC_API_KEY"] = ""
      expect(described_class.configured?).to be(false)
    end

    it "es true con API key" do
      ENV["ANTHROPIC_API_KEY"] = "sk-test"
      expect(described_class.configured?).to be(true)
    end

    it "quita comillas envolventes de la key" do
      ENV["ANTHROPIC_API_KEY"] = '"sk-ant-test"'
      expect(described_class.api_key).to eq("sk-ant-test")
    end
  end

  describe "#call sin API key" do
    it "usa reglas y marca ai_used false" do
      ENV["ANTHROPIC_API_KEY"] = ""
      result = described_class.new(opp).call
      expect(result.ai_used?).to be(false)
      expect(result.temperature).to eq("hot")
      expect(result.fallback_reason).to eq("missing_api_key")
    end
  end

  describe "#call con API key" do
    let(:anthropic_body) do
      {
        "content" => [{
          "text" => '{"temperature":"warm","reasoning":"Interés medio.","next_action":"Llamar mañana."}'
        }]
      }
    end

    it "parsea respuesta JSON de Claude" do
      stub_request(:post, "https://api.anthropic.com/v1/messages")
        .to_return(status: 200, body: anthropic_body.to_json, headers: { "Content-Type" => "application/json" })

      ENV["ANTHROPIC_API_KEY"] = "sk-test"
      result = described_class.new(opp).call
      expect(result.ai_used?).to be(true)
      expect(result.temperature).to eq("warm")
      expect(result.reasoning).to include("Interés")
    end

    it "hace fallback si Anthropic falla" do
      stub_request(:post, "https://api.anthropic.com/v1/messages")
        .to_return(status: 401, body: { error: { message: "invalid" } }.to_json)

      ENV["ANTHROPIC_API_KEY"] = "sk-test"
      result = described_class.new(opp).call
      expect(result.ai_used?).to be(false)
      expect(result.fallback_reason).to eq("api_error")
    end
  end
end
