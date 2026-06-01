# frozen_string_literal: true

require "rails_helper"

RSpec.describe PipelinePolicy do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:pipeline)   { create(:pipeline, tenant: tenant) }
  let(:admin)      { create(:user, :admin,      tenant: tenant) }
  let(:manager)    { create(:user, :manager,    tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let(:viewer)     { create(:user, :viewer,     tenant: tenant) }

  describe "index? / show?" do
    it "permite a todo el staff (staff? = todos los roles)" do
      [admin, manager, consultant, viewer].each do |u|
        expect(described_class.new(u, pipeline).index?).to be(true)
        expect(described_class.new(u, pipeline).show?).to  be(true)
      end
    end
  end

  describe "create? / update?" do
    it "permite a admin y manager" do
      expect(described_class.new(admin,   pipeline).create?).to be(true)
      expect(described_class.new(manager, pipeline).create?).to be(true)
      expect(described_class.new(admin,   pipeline).update?).to be(true)
      expect(described_class.new(manager, pipeline).update?).to be(true)
    end

    it "deniega a consultant y viewer" do
      expect(described_class.new(consultant, pipeline).create?).to be(false)
      expect(described_class.new(viewer,     pipeline).create?).to be(false)
      expect(described_class.new(consultant, pipeline).update?).to be(false)
    end
  end

  describe "destroy?" do
    it "solo admin" do
      expect(described_class.new(admin,      pipeline).destroy?).to be(true)
      expect(described_class.new(manager,    pipeline).destroy?).to be(false)
      expect(described_class.new(consultant, pipeline).destroy?).to be(false)
    end
  end
end
