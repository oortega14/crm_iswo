# frozen_string_literal: true

require "rails_helper"

RSpec.describe Maintenance::DemoDataPurger, "landings" do
  let(:tenant) { create(:tenant, slug: "iswo", name: "ISWO") }

  before do
    ActsAsTenant.current_tenant = tenant
    ActsAsTenant.with_tenant(tenant) do
      create(:landing_page, tenant: tenant, slug: "diagnostico-iso-gratuito", title: "Plantilla producto")
      create(:landing_page, tenant: tenant, slug: "demo-pack-1", title: "Landing demo")
    end
  end

  def purge_landings!
    purger = described_class.new(wipe_tenant_slugs: [])
    ActsAsTenant.with_tenant(tenant) { purger.send(:purge_landing_demo_data!) }
  end

  it "elimina todas las landings en vertical F5 (sin plantillas conservadas)" do
    expect(LandingPage.where(tenant: tenant).count).to eq(2)

    purge_landings!

    expect(LandingPage.where(tenant: tenant)).to be_empty
  end

  it "reset_landing_templates deja F5 sin landings" do
    described_class.new(wipe_tenant_slugs: []).send(:reset_landing_templates!)

    expect(LandingPage.where(tenant: tenant)).to be_empty
  end
end
