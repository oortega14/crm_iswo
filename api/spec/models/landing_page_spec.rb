# frozen_string_literal: true

require "rails_helper"

RSpec.describe LandingPage, type: :model do
  let(:tenant) { ActsAsTenant.current_tenant }
  subject { build(:landing_page, tenant: tenant) }

  describe "asociaciones" do
    it { is_expected.to belong_to(:tenant) }
    it { is_expected.to have_many(:landing_form_submissions).dependent(:destroy) }
  end

  describe "validaciones" do
    it { is_expected.to validate_presence_of(:title) }
    it { is_expected.to validate_presence_of(:slug) }

    it "valida unicidad del slug por tenant (case-insensitive)" do
      create(:landing_page, tenant: tenant, slug: "oferta-2026")
      duplicate = build(:landing_page, tenant: tenant, slug: "OFERTA-2026")
      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:slug]).to be_present
    end

    it "rechaza slugs con caracteres inválidos" do
      page = build(:landing_page, tenant: tenant, slug: "Slug Inválido!")
      expect(page).not_to be_valid
      expect(page.errors[:slug]).to be_present
    end

    it "permite mismo slug en tenants distintos", :without_tenant do
      t1 = create(:tenant, slug: "t1")
      t2 = create(:tenant, slug: "t2")
      ActsAsTenant.with_tenant(t1) { create(:landing_page, tenant: t1, slug: "oferta") }
      ActsAsTenant.with_tenant(t2) { expect(build(:landing_page, tenant: t2, slug: "oferta")).to be_valid }
    end
  end

  describe "callbacks" do
    it "normaliza el slug a minúsculas antes de validar" do
      page = build(:landing_page, tenant: tenant, slug: "  MiLanding  ")
      page.valid?
      expect(page.slug).to eq("milanding")
    end

    it "setea published_at cuando se publica por primera vez" do
      page = create(:landing_page, tenant: tenant, published: false, published_at: nil)
      page.update!(published: true)
      expect(page.published_at).to be_present
    end

    it "resetea published_at si se despublica" do
      page = create(:landing_page, :published, tenant: tenant)
      page.update!(published: false)
      expect(page.published_at).to be_nil
    end
  end

  describe "scopes" do
    it ".published filtra por published=true" do
      published = create(:landing_page, :published, tenant: tenant)
      draft     = create(:landing_page, tenant: tenant, published: false)

      expect(LandingPage.published).to include(published)
      expect(LandingPage.published).not_to include(draft)
    end
  end

  describe "#public_url" do
    it "arma URL con slug del tenant y del landing" do
      page = build(:landing_page, tenant: tenant, slug: "black-friday")
      expect(page.public_url).to eq("https://#{tenant.slug}.crm.iswo.com.co/black-friday")
    end
  end
end
