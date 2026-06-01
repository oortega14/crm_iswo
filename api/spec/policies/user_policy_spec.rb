# frozen_string_literal: true

require "rails_helper"

RSpec.describe UserPolicy do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:admin)      { create(:user, :admin,      tenant: tenant) }
  let(:manager)    { create(:user, :manager,    tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let(:viewer)     { create(:user, :viewer,     tenant: tenant) }

  describe "index?" do
    it "permite a admin y manager" do
      expect(described_class.new(admin,   consultant).index?).to be(true)
      expect(described_class.new(manager, consultant).index?).to be(true)
    end

    it "deniega a consultant y viewer" do
      expect(described_class.new(consultant, consultant).index?).to be(false)
      expect(described_class.new(viewer,     consultant).index?).to be(false)
    end
  end

  describe "show?" do
    it "admin y manager pueden ver cualquier usuario" do
      expect(described_class.new(admin,   consultant).show?).to be(true)
      expect(described_class.new(manager, consultant).show?).to be(true)
    end

    it "consultant puede verse a sí mismo" do
      expect(described_class.new(consultant, consultant).show?).to be(true)
    end

    it "consultant no puede ver a otros" do
      expect(described_class.new(consultant, manager).show?).to be(false)
    end
  end

  describe "create?" do
    it "solo admin puede crear usuarios" do
      expect(described_class.new(admin,   consultant).create?).to be(true)
      expect(described_class.new(manager, consultant).create?).to be(false)
    end
  end

  describe "update?" do
    it "admin puede editar cualquier usuario" do
      expect(described_class.new(admin, consultant).update?).to be(true)
    end

    it "usuario puede editarse a sí mismo" do
      expect(described_class.new(consultant, consultant).update?).to be(true)
    end

    it "consultant no puede editar a otros" do
      expect(described_class.new(consultant, manager).update?).to be(false)
    end
  end

  describe "destroy?" do
    it "admin puede eliminar a otro usuario" do
      expect(described_class.new(admin, consultant).destroy?).to be(true)
    end

    it "admin NO puede eliminarse a sí mismo" do
      expect(described_class.new(admin, admin).destroy?).to be(false)
    end

    it "manager no puede eliminar usuarios" do
      expect(described_class.new(manager, consultant).destroy?).to be(false)
    end
  end

  describe "activate? / deactivate? / reset_password?" do
    it "solo admin" do
      expect(described_class.new(admin,   consultant).activate?).to be(true)
      expect(described_class.new(admin,   consultant).deactivate?).to be(true)
      expect(described_class.new(admin,   consultant).reset_password?).to be(true)
      expect(described_class.new(manager, consultant).activate?).to be(false)
    end
  end

  describe "Scope#resolve" do
    it "admin y manager ven todos los usuarios del tenant" do
      expect(described_class::Scope.new(admin,   User).resolve).to include(consultant, manager)
      expect(described_class::Scope.new(manager, User).resolve).to include(consultant)
    end

    it "consultant ve solo su propio perfil" do
      scope = described_class::Scope.new(consultant, User).resolve
      expect(scope).to include(consultant)
      expect(scope).not_to include(admin)
    end
  end
end
