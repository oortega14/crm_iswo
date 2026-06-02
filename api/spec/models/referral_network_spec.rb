# frozen_string_literal: true

require "rails_helper"

RSpec.describe ReferralNetwork, type: :model do
  let(:tenant)   { ActsAsTenant.current_tenant }
  let(:referrer) { create(:user, :consultant, tenant: tenant) }
  let(:referred) { create(:user, :consultant, tenant: tenant) }

  subject(:edge) do
    build(:referral_network, tenant: tenant, referrer_user: referrer, referred_user: referred, depth: 1)
  end

  describe "validaciones" do
    it { is_expected.to be_valid }

    it "requiere depth >= 1" do
      edge.depth = 0
      expect(edge).not_to be_valid
      expect(edge.errors[:depth]).to be_present
    end

    it "no permite auto-referencia" do
      edge.referred_user = referrer
      expect(edge).not_to be_valid
      expect(edge.errors[:referred_user_id]).to be_present
    end

    it "no permite duplicar el par referrer→referred en el mismo tenant" do
      edge.save!
      dup = build(:referral_network, tenant: tenant, referrer_user: referrer, referred_user: referred, depth: 1)
      expect(dup).not_to be_valid
      expect(dup.errors[:referrer_user_id]).to be_present
    end

    it "no permite ciclos en la red" do
      middle = create(:user, :consultant, tenant: tenant)
      create(:referral_network, tenant: tenant, referrer_user: referrer, referred_user: middle, depth: 1)
      create(:referral_network, tenant: tenant, referrer_user: middle, referred_user: referred, depth: 1)
      cycle = build(:referral_network, tenant: tenant, referrer_user: referred, referred_user: referrer, depth: 1)
      expect(cycle).not_to be_valid
      expect(cycle.errors[:base]).to be_present
    end

    it "valida que ambos usuarios pertenezcan al mismo tenant" do
      other_tenant = create(:tenant, slug: "otro-#{SecureRandom.hex(4)}")
      outsider = ActsAsTenant.with_tenant(other_tenant) { create(:user, :consultant, tenant: other_tenant) }
      edge.referred_user = outsider
      expect(edge).not_to be_valid
      expect(edge.errors[:base]).to be_present
    end
  end

  describe ".active scope" do
    it "devuelve solo relaciones activas" do
      active_edge = create(:referral_network, tenant: tenant, referrer_user: referrer, referred_user: referred, depth: 1, active: true)
      inactive_edge = create(:referral_network, tenant: tenant,
                             referrer_user: referred,
                             referred_user: create(:user, :consultant, tenant: tenant),
                             depth: 1, active: false)
      expect(ReferralNetwork.active).to include(active_edge)
      expect(ReferralNetwork.active).not_to include(inactive_edge)
    end
  end
end
