# frozen_string_literal: true

require "rails_helper"

RSpec.describe DuplicateFlagPolicy do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:pipeline)   { create(:pipeline_with_stages, tenant: tenant) }
  let(:contact)    { create(:contact, tenant: tenant) }
  let(:opp)        { create(:opportunity, tenant: tenant, contact: contact, pipeline: pipeline, pipeline_stage: pipeline.pipeline_stages.first) }
  let(:flag)       { create(:duplicate_flag, tenant: tenant, opportunity: opp) }
  let(:admin)      { create(:user, :admin,      tenant: tenant) }
  let(:manager)    { create(:user, :manager,    tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let(:viewer)     { create(:user, :viewer,     tenant: tenant) }

  describe "index? / show?" do
    it "permite a todo el staff" do
      [admin, manager, consultant, viewer].each do |u|
        expect(described_class.new(u, flag).index?).to be(true)
        expect(described_class.new(u, flag).show?).to  be(true)
      end
    end
  end

  describe "create? / update? / reassign? / merge? / ignore?" do
    it "permite a admin y manager" do
      expect(described_class.new(admin,   flag).create?).to   be(true)
      expect(described_class.new(manager, flag).create?).to   be(true)
      expect(described_class.new(admin,   flag).reassign?).to be(true)
      expect(described_class.new(manager, flag).merge?).to    be(true)
      expect(described_class.new(admin,   flag).ignore?).to   be(true)
    end

    it "deniega a consultant y viewer" do
      expect(described_class.new(consultant, flag).update?).to   be(false)
      expect(described_class.new(viewer,     flag).reassign?).to be(false)
      expect(described_class.new(consultant, flag).merge?).to    be(false)
    end
  end

  describe "destroy?" do
    it "solo admin" do
      expect(described_class.new(admin,      flag).destroy?).to be(true)
      expect(described_class.new(manager,    flag).destroy?).to be(false)
      expect(described_class.new(consultant, flag).destroy?).to be(false)
    end
  end
end
