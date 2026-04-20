# frozen_string_literal: true

require "rails_helper"

RSpec.describe Tenant, type: :model do
  subject { build(:tenant) }

  describe "asociaciones" do
    it { is_expected.to have_many(:users).dependent(:destroy) }
    it { is_expected.to have_many(:pipelines).dependent(:destroy) }
    it { is_expected.to have_many(:pipeline_stages).dependent(:destroy) }
    it { is_expected.to have_many(:lead_sources).dependent(:destroy) }
    it { is_expected.to have_many(:contacts).dependent(:destroy) }
    it { is_expected.to have_many(:opportunities).dependent(:destroy) }
    it { is_expected.to have_many(:opportunity_logs).dependent(:destroy) }
    it { is_expected.to have_many(:reminders).dependent(:destroy) }
    it { is_expected.to have_many(:duplicate_flags).dependent(:destroy) }
    it { is_expected.to have_many(:referral_networks).dependent(:destroy) }
    it { is_expected.to have_many(:landing_pages).dependent(:destroy) }
    it { is_expected.to have_many(:landing_form_submissions).dependent(:destroy) }
    it { is_expected.to have_many(:ad_integrations).dependent(:destroy) }
    it { is_expected.to have_many(:whatsapp_messages).dependent(:destroy) }
    it { is_expected.to have_many(:exports).dependent(:destroy) }
    it { is_expected.to have_many(:audit_events).dependent(:nullify) }
    it { is_expected.to have_one(:bant_criterion).dependent(:destroy) }
  end

  describe "validaciones", :without_tenant do
    before { create(:tenant, slug: "taken-slug") }

    it { is_expected.to validate_presence_of(:name) }
    it { is_expected.to validate_presence_of(:slug) }
    it { is_expected.to validate_presence_of(:timezone) }
    it { is_expected.to validate_presence_of(:locale) }
    it { is_expected.to validate_presence_of(:currency) }

    it { is_expected.to validate_length_of(:currency).is_equal_to(3) }

    it "valida unicidad de slug (case-insensitive)" do
      duplicate = build(:tenant, slug: "TAKEN-SLUG")
      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:slug]).to be_present
    end

    it "rechaza slugs con caracteres inválidos" do
      tenant = build(:tenant, slug: "Invalid Slug!")
      expect(tenant).not_to be_valid
      expect(tenant.errors[:slug]).to be_present
    end

    it "acepta slugs alfanuméricos con guiones" do
      tenant = build(:tenant, slug: "iswo-co-01")
      expect(tenant).to be_valid
    end
  end

  describe "callbacks", :without_tenant do
    it "normaliza el slug a minúsculas antes de validar" do
      tenant = build(:tenant, slug: "  MiCasita-Slug  ")
      tenant.valid?
      expect(tenant.slug).to eq("micasita-slug")
    end
  end

  describe ".active", :without_tenant do
    it "devuelve solo tenants activos y no descartados" do
      active    = create(:tenant, active: true)
      inactive  = create(:tenant, active: false)
      discarded = create(:tenant, active: true)
      discarded.discard

      expect(Tenant.active).to include(active)
      expect(Tenant.active).not_to include(inactive, discarded)
    end
  end
end
