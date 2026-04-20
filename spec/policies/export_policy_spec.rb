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
    it "todo staff" do
      [admin, manager, consultant, viewer].each do |u|
        expect(described_class.new(u, Export.new).index?).to be(true)
      end
    end
  end

  describe "show?" do
    it "admin/manager ven cualquier export" do
      expect(described_class.new(admin,   foreign_export).show?).to be(true)
      expect(described_class.new(manager, foreign_export).show?).to be(true)
    end

    it "el usuario dueño puede verlo" do
      expect(described_class.new(consultant, own_export).show?).to be(true)
    end

    it "consultant NO ve exports ajenos" do
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

    it "consultant y viewer ven solo los suyos" do
      expect(described_class::Scope.new(consultant, Export).resolve).to match_array([own_export])
      expect(described_class::Scope.new(viewer,     Export).resolve).to be_empty
    end

    it "scope.none sin usuario" do
      expect(described_class::Scope.new(nil, Export).resolve).to be_empty
    end
  end
end
