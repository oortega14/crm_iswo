# frozen_string_literal: true

require "rails_helper"

RSpec.describe User, type: :model do
  let(:tenant) { ActsAsTenant.current_tenant }
  subject { build(:user, tenant: tenant) }

  describe "asociaciones" do
    it { is_expected.to belong_to(:tenant) }

    it {
      is_expected.to have_many(:owned_contacts)
        .class_name("Contact")
        .with_foreign_key(:owner_user_id)
        .dependent(:nullify)
    }

    it {
      is_expected.to have_many(:owned_opportunities)
        .class_name("Opportunity")
        .with_foreign_key(:owner_user_id)
        .dependent(:nullify)
    }

    it { is_expected.to have_many(:reminders).dependent(:destroy) }
    it { is_expected.to have_many(:opportunity_logs).dependent(:nullify) }
    it { is_expected.to have_many(:exports).dependent(:nullify) }

    it {
      is_expected.to have_many(:outgoing_referrals)
        .class_name("ReferralNetwork")
        .with_foreign_key(:referrer_user_id)
        .dependent(:destroy)
    }

    it {
      is_expected.to have_many(:incoming_referrals)
        .class_name("ReferralNetwork")
        .with_foreign_key(:referred_user_id)
        .dependent(:destroy)
    }

    it { is_expected.to have_many(:referred_users).through(:outgoing_referrals) }
    it { is_expected.to have_many(:referrers).through(:incoming_referrals) }
  end

  describe "validaciones" do
    it { is_expected.to validate_presence_of(:email) }
    it { is_expected.to validate_presence_of(:name) }
    it { is_expected.to allow_value("user@example.com").for(:email) }
    it { is_expected.not_to allow_value("not-an-email").for(:email) }
    it { is_expected.to validate_inclusion_of(:role).in_array(User::ROLES) }

    it "valida longitud mínima de password" do
      user = build(:user, password: "short", password_confirmation: "short")
      expect(user).not_to be_valid
      expect(user.errors[:password]).to be_present
    end

    it "valida unicidad del email por tenant (case-insensitive)" do
      create(:user, email: "oscar@iswo.co", tenant: tenant)
      duplicate = build(:user, email: "OSCAR@ISWO.CO", tenant: tenant)
      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:email]).to be_present
    end

    it "permite mismo email en tenants distintos", :without_tenant do
      t1 = create(:tenant, slug: "t1")
      t2 = create(:tenant, slug: "t2")
      create(:user, email: "oscar@iswo.co", tenant: t1)
      other = build(:user, email: "oscar@iswo.co", tenant: t2)
      expect(other).to be_valid
    end
  end

  describe "callbacks" do
    it "normaliza el email antes de validar" do
      user = build(:user, email: "  OSCAR@ISWO.CO  ")
      user.valid?
      expect(user.email).to eq("oscar@iswo.co")
    end
  end

  describe "enum role" do
    it "tiene default consultant" do
      expect(User.new.role).to eq("consultant")
    end

    it "expone predicate methods prefijados con role_" do
      user = build(:user, :admin)
      expect(user.role_admin?).to be(true)
      expect(user.role_manager?).to be(false)
    end
  end

  describe "#staff?" do
    it "es true para admin y manager" do
      expect(build(:user, :admin)).to be_staff
      expect(build(:user, :manager)).to be_staff
    end

    it "es false para consultant y viewer" do
      expect(build(:user, :consultant)).not_to be_staff
      expect(build(:user, :viewer)).not_to be_staff
    end
  end

  describe "#can_export?" do
    it "sigue la misma regla que staff?" do
      expect(build(:user, :admin).can_export?).to be(true)
      expect(build(:user, :manager).can_export?).to be(true)
      expect(build(:user, :consultant).can_export?).to be(false)
      expect(build(:user, :viewer).can_export?).to be(false)
    end
  end

  describe "scopes" do
    it ".active devuelve solo activos no descartados" do
      active   = create(:user, tenant: tenant, active: true)
      inactive = create(:user, :inactive, tenant: tenant)
      discarded = create(:user, tenant: tenant, active: true)
      discarded.discard

      expect(User.active).to include(active)
      expect(User.active).not_to include(inactive, discarded)
    end

    it ".by_role filtra por rol" do
      admin = create(:user, :admin, tenant: tenant)
      consultant = create(:user, :consultant, tenant: tenant)
      expect(User.by_role("admin")).to include(admin)
      expect(User.by_role("admin")).not_to include(consultant)
    end
  end
end
