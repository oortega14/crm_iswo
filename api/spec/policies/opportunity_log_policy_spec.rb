# frozen_string_literal: true

require "rails_helper"

RSpec.describe OpportunityLogPolicy do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:pipeline)   { create(:pipeline_with_stages, tenant: tenant) }
  let(:contact)    { create(:contact, tenant: tenant) }
  let(:opp)        { create(:opportunity, tenant: tenant, contact: contact, pipeline: pipeline, pipeline_stage: pipeline.pipeline_stages.first) }
  let(:log)        { create(:opportunity_log, tenant: tenant, opportunity: opp) }
  let(:admin)      { create(:user, :admin,      tenant: tenant) }
  let(:manager)    { create(:user, :manager,    tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let(:viewer)     { create(:user, :viewer,     tenant: tenant) }

  describe "index? / show?" do
    it "permite a todo el staff" do
      [admin, manager, consultant, viewer].each do |u|
        expect(described_class.new(u, log).index?).to be(true)
        expect(described_class.new(u, log).show?).to  be(true)
      end
    end
  end

  describe "create?" do
    it "permite a admin, manager y consultant" do
      expect(described_class.new(admin,      log).create?).to be(true)
      expect(described_class.new(manager,    log).create?).to be(true)
      expect(described_class.new(consultant, log).create?).to be(true)
    end

    it "deniega a viewer" do
      expect(described_class.new(viewer, log).create?).to be(false)
    end
  end

  describe "update? / destroy?" do
    it "nadie puede modificar ni eliminar logs (son inmutables)" do
      [admin, manager, consultant, viewer].each do |u|
        expect(described_class.new(u, log).update?).to  be(false)
        expect(described_class.new(u, log).destroy?).to be(false)
      end
    end
  end
end
