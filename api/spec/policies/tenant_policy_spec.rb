# frozen_string_literal: true

require "rails_helper"

RSpec.describe TenantPolicy do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:admin)      { create(:user, :admin,      tenant: tenant) }
  let(:manager)    { create(:user, :manager,    tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let(:viewer)     { create(:user, :viewer,     tenant: tenant) }

  describe "show?" do
    it "permite a todo el staff" do
      [admin, manager, consultant, viewer].each do |u|
        expect(described_class.new(u, tenant).show?).to be(true)
      end
    end
  end

  describe "update?" do
    it "solo admin" do
      expect(described_class.new(admin,      tenant).update?).to be(true)
      expect(described_class.new(manager,    tenant).update?).to be(false)
      expect(described_class.new(consultant, tenant).update?).to be(false)
    end
  end

  describe "destroy?" do
    it "nadie puede eliminar un tenant desde la API" do
      [admin, manager, consultant, viewer].each do |u|
        expect(described_class.new(u, tenant).destroy?).to be(false)
      end
    end
  end

  describe "Scope#resolve" do
    it "devuelve solo el tenant del usuario" do
      other = create(:tenant, slug: "other-#{SecureRandom.hex(3)}")
      scope = described_class::Scope.new(admin, Tenant).resolve
      expect(scope).to include(tenant)
      expect(scope).not_to include(other)
    end
  end
end
