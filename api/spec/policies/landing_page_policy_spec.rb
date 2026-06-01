# frozen_string_literal: true

require "rails_helper"

RSpec.describe LandingPagePolicy do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:landing)    { create(:landing_page, tenant: tenant) }
  let(:admin)      { create(:user, :admin,      tenant: tenant) }
  let(:manager)    { create(:user, :manager,    tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let(:viewer)     { create(:user, :viewer,     tenant: tenant) }

  describe "index? / show?" do
    it "permite a todo el staff" do
      [admin, manager, consultant, viewer].each do |u|
        expect(described_class.new(u, landing).index?).to be(true)
        expect(described_class.new(u, landing).show?).to  be(true)
      end
    end
  end

  describe "create? / update? / publish? / unpublish? / duplicate?" do
    it "permite a admin y manager" do
      expect(described_class.new(admin,   landing).create?).to    be(true)
      expect(described_class.new(manager, landing).create?).to    be(true)
      expect(described_class.new(admin,   landing).publish?).to   be(true)
      expect(described_class.new(manager, landing).unpublish?).to be(true)
      expect(described_class.new(admin,   landing).duplicate?).to be(true)
    end

    it "deniega a consultant y viewer" do
      expect(described_class.new(consultant, landing).create?).to    be(false)
      expect(described_class.new(viewer,     landing).update?).to    be(false)
      expect(described_class.new(consultant, landing).publish?).to   be(false)
      expect(described_class.new(consultant, landing).duplicate?).to be(false)
    end
  end

  describe "destroy?" do
    it "solo admin" do
      expect(described_class.new(admin,      landing).destroy?).to be(true)
      expect(described_class.new(manager,    landing).destroy?).to be(false)
      expect(described_class.new(consultant, landing).destroy?).to be(false)
    end
  end
end
