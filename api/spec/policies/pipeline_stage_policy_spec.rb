# frozen_string_literal: true

require "rails_helper"

RSpec.describe PipelineStagePolicy do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:pipeline)   { create(:pipeline, tenant: tenant) }
  let(:stage)      { create(:pipeline_stage, pipeline: pipeline, tenant: tenant) }
  let(:admin)      { create(:user, :admin,      tenant: tenant) }
  let(:manager)    { create(:user, :manager,    tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let(:viewer)     { create(:user, :viewer,     tenant: tenant) }

  describe "index? / show?" do
    it "permite a todo el staff" do
      [admin, manager, consultant, viewer].each do |u|
        expect(described_class.new(u, stage).index?).to be(true)
        expect(described_class.new(u, stage).show?).to  be(true)
      end
    end
  end

  describe "create? / update? / reorder?" do
    it "permite a admin y manager" do
      expect(described_class.new(admin,   stage).create?).to  be(true)
      expect(described_class.new(manager, stage).create?).to  be(true)
      expect(described_class.new(admin,   stage).update?).to  be(true)
      expect(described_class.new(admin,   stage).reorder?).to be(true)
      expect(described_class.new(manager, stage).reorder?).to be(true)
    end

    it "deniega a consultant y viewer" do
      expect(described_class.new(consultant, stage).create?).to  be(false)
      expect(described_class.new(viewer,     stage).update?).to  be(false)
      expect(described_class.new(consultant, stage).reorder?).to be(false)
    end
  end

  describe "destroy?" do
    it "solo admin" do
      expect(described_class.new(admin,      stage).destroy?).to be(true)
      expect(described_class.new(manager,    stage).destroy?).to be(false)
      expect(described_class.new(consultant, stage).destroy?).to be(false)
    end
  end
end
