# frozen_string_literal: true

require "rails_helper"

RSpec.describe ApplicationPolicy do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:record) { double("Record", tenant_id: tenant.id) }

  %i[admin manager consultant viewer].each do |role|
    let(role) { build_stubbed(:user, role, tenant: tenant) }
  end

  describe "defaults" do
    it "index? / show? habilitan a todo staff" do
      %i[admin manager consultant viewer].each do |role|
        policy = described_class.new(send(role), record)
        expect(policy.index?).to be(true), "#{role} debería ver index"
        expect(policy.show?).to be(true), "#{role} debería ver show"
      end
    end

    it "index? es false si no hay usuario" do
      expect(described_class.new(nil, record).index?).to be(false)
    end

    it "create? / update? solo admin y manager" do
      expect(described_class.new(admin,      record).create?).to be(true)
      expect(described_class.new(manager,    record).create?).to be(true)
      expect(described_class.new(consultant, record).create?).to be(false)
      expect(described_class.new(viewer,     record).create?).to be(false)
    end

    it "destroy? solo admin" do
      expect(described_class.new(admin,      record).destroy?).to be(true)
      expect(described_class.new(manager,    record).destroy?).to be(false)
      expect(described_class.new(consultant, record).destroy?).to be(false)
      expect(described_class.new(viewer,     record).destroy?).to be(false)
    end
  end

  describe "#same_tenant? (defense in depth)" do
    it "true cuando record.tenant_id coincide con user.tenant_id" do
      policy = described_class.new(admin, record)
      expect(policy.send(:same_tenant?)).to be(true)
    end

    it "false cuando el record pertenece a otro tenant" do
      other = double("Record", tenant_id: tenant.id + 999)
      policy = described_class.new(admin, other)
      expect(policy.send(:same_tenant?)).to be(false)
    end

    it "true cuando el record no tiene tenant_id (no es modelo tenant-scoped)" do
      bare = double("Record")
      policy = described_class.new(admin, bare)
      expect(policy.send(:same_tenant?)).to be(true)
    end

    it "false cuando no hay usuario" do
      policy = described_class.new(nil, record)
      expect(policy.send(:same_tenant?)).to be(false)
    end
  end

  describe "Scope#resolve" do
    it "devuelve scope.all por default" do
      scope = double("Scope", all: :all_records)
      expect(ApplicationPolicy::Scope.new(admin, scope).resolve).to eq(:all_records)
    end
  end
end
