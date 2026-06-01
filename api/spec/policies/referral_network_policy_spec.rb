# frozen_string_literal: true

require "rails_helper"

RSpec.describe ReferralNetworkPolicy do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:admin)      { create(:user, :admin,      tenant: tenant) }
  let(:manager)    { create(:user, :manager,    tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let(:referred)   { create(:user, :consultant, tenant: tenant) }
  let(:viewer)     { create(:user, :viewer,     tenant: tenant) }
  let(:edge)       { create(:referral_network, tenant: tenant, referrer_user: consultant, referred_user: referred, depth: 1) }

  describe "index? / show?" do
    it "permite a todo el staff" do
      [admin, manager, consultant, viewer].each do |u|
        expect(described_class.new(u, edge).index?).to be(true)
        expect(described_class.new(u, edge).show?).to  be(true)
      end
    end
  end

  describe "create? / update?" do
    it "permite a admin y manager" do
      expect(described_class.new(admin,   edge).create?).to be(true)
      expect(described_class.new(manager, edge).update?).to be(true)
    end

    it "deniega a consultant y viewer" do
      expect(described_class.new(consultant, edge).create?).to be(false)
      expect(described_class.new(viewer,     edge).update?).to be(false)
    end
  end

  describe "destroy?" do
    it "solo admin" do
      expect(described_class.new(admin,      edge).destroy?).to be(true)
      expect(described_class.new(manager,    edge).destroy?).to be(false)
      expect(described_class.new(consultant, edge).destroy?).to be(false)
    end
  end

  describe "tree?" do
    it "admin y manager pueden ver cualquier árbol" do
      expect(described_class.new(admin,   edge).tree?(referred.id)).to be(true)
      expect(described_class.new(manager, edge).tree?(referred.id)).to be(true)
    end

    it "consultant solo puede ver su propio árbol" do
      expect(described_class.new(consultant, edge).tree?(consultant.id)).to be(true)
      expect(described_class.new(consultant, edge).tree?(referred.id)).to be(false)
    end
  end

  describe "Scope#resolve" do
    it "admin ve todos los edges" do
      edge
      expect(described_class::Scope.new(admin, ReferralNetwork).resolve).to include(edge)
    end

    it "consultant ve sus propios edges (referrer o referred)" do
      edge
      scope = described_class::Scope.new(consultant, ReferralNetwork).resolve
      expect(scope).to include(edge)
    end
  end
end
