# frozen_string_literal: true

require "rails_helper"

RSpec.describe Pipeline, type: :model do
  let(:tenant) { ActsAsTenant.current_tenant }
  subject { build(:pipeline, tenant: tenant) }

  describe "asociaciones" do
    it { is_expected.to belong_to(:tenant) }
    it { is_expected.to have_many(:pipeline_stages).dependent(:destroy) }
    it { is_expected.to have_many(:opportunities).dependent(:restrict_with_exception) }
  end

  describe "validaciones" do
    it { is_expected.to validate_presence_of(:name) }

    it "valida unicidad del nombre por tenant (case-insensitive)" do
      create(:pipeline, tenant: tenant, name: "Ventas B2B")
      duplicate = build(:pipeline, tenant: tenant, name: "ventas b2b")
      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:name]).to be_present
    end

    it "permite múltiples pipelines default=false para el mismo tenant" do
      create(:pipeline, tenant: tenant, is_default: false)
      another = build(:pipeline, tenant: tenant, is_default: false)
      expect(another).to be_valid
    end

    it "rechaza un segundo pipeline default para el mismo tenant" do
      create(:pipeline, tenant: tenant, is_default: true)
      second = build(:pipeline, tenant: tenant, is_default: true)
      expect(second).not_to be_valid
      expect(second.errors[:is_default]).to be_present
    end
  end

  describe "scopes" do
    it ".active devuelve pipelines activos no descartados" do
      active    = create(:pipeline, tenant: tenant, active: true)
      inactive  = create(:pipeline, tenant: tenant, active: false)
      discarded = create(:pipeline, tenant: tenant, active: true)
      discarded.discard

      expect(Pipeline.active).to include(active)
      expect(Pipeline.active).not_to include(inactive, discarded)
    end

    it ".default devuelve solo is_default=true" do
      default_p = create(:pipeline, tenant: tenant, is_default: true)
      create(:pipeline, tenant: tenant, is_default: false)
      expect(Pipeline.default).to include(default_p)
      expect(Pipeline.default.count).to eq(1)
    end
  end

  describe "helpers" do
    let(:pipeline) { create(:pipeline_with_stages, tenant: tenant) }

    it "#default_stage devuelve la etapa de menor position" do
      expect(pipeline.default_stage).to eq(pipeline.pipeline_stages.order(:position).first)
    end

    it "#closed_won_stage encuentra la etapa con closed_won=true" do
      won = pipeline.pipeline_stages.find_by(closed_won: true)
      expect(pipeline.closed_won_stage).to eq(won)
    end

    it "#closed_lost_stage devuelve nil si no hay etapa lost" do
      expect(pipeline.closed_lost_stage).to be_nil
    end
  end
end
