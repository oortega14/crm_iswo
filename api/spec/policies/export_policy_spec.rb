# frozen_string_literal: true

require "rails_helper"

RSpec.describe ExportPolicy do
  let(:tenant) { ActsAsTenant.current_tenant }

  let(:admin)      { create(:user, :admin,      tenant: tenant) }
  let(:manager)    { create(:user, :manager,    tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let(:viewer)     { create(:user, :viewer,     tenant: tenant) }

  let(:own_export)     { create(:export, tenant: tenant, user: consultant) }
  let(:foreign_export) { create(:export, tenant: tenant, user: admin) }

  describe "index?" do
    it "solo admin y manager (RFC §6.7)" do
      expect(described_class.new(admin,   Export.new).index?).to be(true)
      expect(described_class.new(manager, Export.new).index?).to be(true)
      expect(described_class.new(consultant, Export.new).index?).to be(false)
      expect(described_class.new(viewer,     Export.new).index?).to be(false)
    end
  end

  describe "show?" do
    it "solo admin y manager" do
      expect(described_class.new(admin,   foreign_export).show?).to be(true)
      expect(described_class.new(manager, foreign_export).show?).to be(true)
      expect(described_class.new(consultant, own_export).show?).to be(false)
      expect(described_class.new(consultant, foreign_export).show?).to be(false)
    end
  end

  describe "create?" do
    it "solo admin y manager" do
      expect(described_class.new(admin,      Export.new).create?).to be(true)
      expect(described_class.new(manager,    Export.new).create?).to be(true)
      expect(described_class.new(consultant, Export.new).create?).to be(false)
      expect(described_class.new(viewer,     Export.new).create?).to be(false)
    end
  end

  describe "destroy?" do
    it "solo admin" do
      expect(described_class.new(admin,      foreign_export).destroy?).to be(true)
      expect(described_class.new(manager,    foreign_export).destroy?).to be(false)
      expect(described_class.new(consultant, own_export).destroy?).to be(false)
    end
  end

  describe "Scope#resolve" do
    before do
      own_export
      foreign_export
    end

    it "admin/manager ven todos" do
      expect(described_class::Scope.new(admin,   Export).resolve).to match_array([own_export, foreign_export])
      expect(described_class::Scope.new(manager, Export).resolve).to match_array([own_export, foreign_export])
    end

    it "consultant y viewer no ven historial" do
      expect(described_class::Scope.new(consultant, Export).resolve).to be_empty
      expect(described_class::Scope.new(viewer,     Export).resolve).to be_empty
    end

    it "scope.none sin usuario" do
      expect(described_class::Scope.new(nil, Export).resolve).to be_empty
    end
  end
end
