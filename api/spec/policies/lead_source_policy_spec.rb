# frozen_string_literal: true

require "rails_helper"

RSpec.describe LeadSourcePolicy do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:source)     { create(:lead_source, tenant: tenant) }
  let(:admin)      { create(:user, :admin,      tenant: tenant) }
  let(:manager)    { create(:user, :manager,    tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let(:viewer)     { create(:user, :viewer,     tenant: tenant) }

  describe "index? / show?" do
    it "permite a todo el staff" do
      [admin, manager, consultant, viewer].each do |u|
        expect(described_class.new(u, source).index?).to be(true)
        expect(described_class.new(u, source).show?).to  be(true)
      end
    end
  end

  describe "create? / update?" do
    it "permite a admin y manager" do
      expect(described_class.new(admin,   source).create?).to be(true)
      expect(described_class.new(manager, source).create?).to be(true)
      expect(described_class.new(admin,   source).update?).to be(true)
    end

    it "deniega a consultant y viewer" do
      expect(described_class.new(consultant, source).create?).to be(false)
      expect(described_class.new(viewer,     source).update?).to be(false)
    end
  end

  describe "destroy?" do
    it "solo admin" do
      expect(described_class.new(admin,      source).destroy?).to be(true)
      expect(described_class.new(manager,    source).destroy?).to be(false)
      expect(described_class.new(consultant, source).destroy?).to be(false)
    end
  end
end
