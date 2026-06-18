# frozen_string_literal: true

require "rails_helper"

RSpec.describe Opportunities::TemperatureCalculator do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:user) { create(:user, :consultant, tenant: tenant) }
  let(:pipeline) { create(:pipeline, tenant: tenant) }
  let(:stage) { create(:pipeline_stage, pipeline: pipeline, tenant: tenant) }
  let(:contact) { create(:contact, tenant: tenant) }

  def build_opp(attrs = {})
    create(:opportunity, {
      tenant: tenant,
      contact: contact,
      pipeline: pipeline,
      pipeline_stage: stage,
      owner_user: user,
      temperature: "cold"
    }.merge(attrs))
  end

  # El callback after_create recalcula bant_score desde custom_fields["bant_data"]
  # (pesos por defecto 25/25/25/25); sin esto, bant_score explícito quedaría
  # sobreescrito a 50 (ver commit 0ed1183).
  def bant_data_with_score(score)
    { "bant_data" => %w[budget authority need timeline].index_with { |_| { "score" => score } } }
  end

  it "marca hot con BANT alto y actividad reciente" do
    opp = build_opp(bant_score: 75, custom_fields: bant_data_with_score(75), last_activity_at: 2.days.ago)
    result = described_class.new(opp).call
    expect(result.temperature).to eq("hot")
  end

  it "marca warm con BANT medio" do
    opp = build_opp(bant_score: 50, custom_fields: bant_data_with_score(50), last_activity_at: 30.days.ago)
    result = described_class.new(opp).call
    expect(result.temperature).to eq("warm")
  end

  it "marca cold con BANT bajo y sin actividad" do
    opp = build_opp(bant_score: 20, custom_fields: bant_data_with_score(20), last_activity_at: 30.days.ago)
    result = described_class.new(opp).call
    expect(result.temperature).to eq("cold")
  end

  it "persiste con apply!" do
    opp = build_opp(bant_score: 80, custom_fields: bant_data_with_score(80), last_activity_at: 1.day.ago, temperature: "cold")
    described_class.new(opp).apply!
    expect(opp.reload.temperature).to eq("hot")
  end
end
