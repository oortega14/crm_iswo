# frozen_string_literal: true

require "rails_helper"

RSpec.describe OpportunityLog, type: :model do
  let(:tenant)   { ActsAsTenant.current_tenant }
  let(:pipeline) { create(:pipeline_with_stages, tenant: tenant) }
  let(:contact)  { create(:contact, tenant: tenant) }
  let(:opp)      { create(:opportunity, tenant: tenant, contact: contact, pipeline: pipeline, pipeline_stage: pipeline.pipeline_stages.first) }

  subject(:log) { build(:opportunity_log, tenant: tenant, opportunity: opp, action: "note") }

  describe "validaciones" do
    it { is_expected.to be_valid }

    it "requiere action válida" do
      expect { log.action = "undefined_action" }.to raise_error(ArgumentError)
    end

    it "permite opportunity nil (logs de sistema/export)" do
      log.opportunity = nil
      expect(log).to be_valid
    end

    it "permite user nil" do
      log.user = nil
      expect(log).to be_valid
    end
  end

  describe "enmascaramiento de campos sensibles (A.8.11)" do
    it "enmascara emails en changes_data al crear" do
      log.changes_data = { "email" => "juan@iswo.co", "note" => "Contactado" }
      log.save!
      expect(log.reload.changes_data["email"]).to match(/\*/)
      expect(log.reload.changes_data["note"]).to eq("Contactado")
    end

    it "enmascara teléfonos en changes_data" do
      log.changes_data = { "phone_e164" => "+573001234567" }
      log.save!
      expect(log.reload.changes_data["phone_e164"]).to match(/\*/)
    end

    it "conserva datos no sensibles sin modificar" do
      log.changes_data = { "stage" => "Calificada", "bant_score" => 75 }
      log.save!
      expect(log.reload.changes_data["stage"]).to eq("Calificada")
      expect(log.reload.changes_data["bant_score"]).to eq(75)
    end

    it "enmascara en estructuras anidadas" do
      log.changes_data = { "contact" => { "email" => "test@test.co", "name" => "Test" } }
      log.save!
      nested = log.reload.changes_data.dig("contact", "email")
      expect(nested).to match(/\*/)
    end
  end

  describe ".recent scope" do
    it "ordena por created_at desc" do
      log1 = create(:opportunity_log, tenant: tenant, opportunity: opp, action: "note", created_at: 2.hours.ago)
      log2 = create(:opportunity_log, tenant: tenant, opportunity: opp, action: "note", created_at: 1.hour.ago)
      expect(OpportunityLog.recent.first).to eq(log2)
      expect(OpportunityLog.recent.last).to eq(log1)
    end
  end
end
