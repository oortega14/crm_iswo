# frozen_string_literal: true

require "rails_helper"

RSpec.describe BantCriterionPolicy do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:criterion)  { tenant.bant_criterion || create(:bant_criterion, tenant: tenant) }
  let(:admin)      { create(:user, :admin,      tenant: tenant) }
  let(:manager)    { create(:user, :manager,    tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let(:viewer)     { create(:user, :viewer,     tenant: tenant) }

  describe "show?" do
    it "permite a todo el staff" do
      [admin, manager, consultant, viewer].each do |u|
        expect(described_class.new(u, criterion).show?).to be(true)
      end
    end
  end

  describe "create? / update?" do
    it "solo admin" do
      expect(described_class.new(admin,   criterion).create?).to be(true)
      expect(described_class.new(admin,   criterion).update?).to be(true)
      expect(described_class.new(manager, criterion).create?).to be(false)
      expect(described_class.new(manager, criterion).update?).to be(false)
    end
  end

  describe "destroy?" do
    it "nadie puede eliminar el criterio BANT" do
      [admin, manager, consultant, viewer].each do |u|
        expect(described_class.new(u, criterion).destroy?).to be(false)
      end
    end
  end
end
