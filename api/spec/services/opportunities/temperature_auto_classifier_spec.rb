# frozen_string_literal: true

require "rails_helper"

RSpec.describe Opportunities::TemperatureAutoClassifier do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:user) { create(:user, :consultant, tenant: tenant) }
  let(:pipeline) { create(:pipeline, tenant: tenant) }
  let(:stage) { create(:pipeline_stage, pipeline: pipeline, tenant: tenant) }
  let(:contact) { create(:contact, tenant: tenant) }
  let(:opp) do
    create(:opportunity, tenant: tenant, contact: contact, pipeline: pipeline,
           pipeline_stage: stage, owner_user: user, notes: "Antes")
  end

  around do |example|
    @orig = ENV["ANTHROPIC_API_KEY"]
    @orig_auto = ENV["ANTHROPIC_AUTO_CLASSIFY_TEMPERATURE"]
    example.run
  ensure
    ENV["ANTHROPIC_API_KEY"] = @orig
    ENV["ANTHROPIC_AUTO_CLASSIFY_TEMPERATURE"] = @orig_auto
  end

  describe ".enqueue_for_opportunity!" do
    it "encola job cuando cambia dossier y auto está activo" do
      ENV["ANTHROPIC_API_KEY"] = "sk-test"
      ENV["ANTHROPIC_AUTO_CLASSIFY_TEMPERATURE"] = "true"

      expect do
        described_class.enqueue_for_opportunity!(
          opportunity:  opp,
          source:       "auto_save",
          user:         user,
          changed_keys: %w[notes]
        )
      end.to have_enqueued_job(OpportunityTemperatureClassifyJob).with(
        opp.id,
        hash_including(tenant_id: tenant.id, source: "auto_save")
      )
    end

    it "no encola si solo cambió temperatura manual" do
      ENV["ANTHROPIC_API_KEY"] = "sk-test"
      ENV["ANTHROPIC_AUTO_CLASSIFY_TEMPERATURE"] = "true"

      expect do
        described_class.enqueue_for_opportunity!(
          opportunity:  opp,
          source:       "auto_save",
          user:         user,
          changed_keys: %w[temperature]
        )
      end.not_to have_enqueued_job(OpportunityTemperatureClassifyJob)
    end
  end
end
