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

  it "elimina landings demo y conserva plantillas ISWO" do
    expect(LandingPage.where(tenant: tenant).count).to eq(2)

    purge_landings!

    expect(LandingPage.where(tenant: tenant).pluck(:slug)).to contain_exactly("diagnostico-iso-gratuito")
  end

  it "reset_landing_templates deja las 3 plantillas ISWO" do
    described_class.new(wipe_tenant_slugs: []).send(:reset_landing_templates!)

    slugs = LandingPage.where(tenant: tenant).pluck(:slug)
    expect(slugs).to contain_exactly(
      "diagnostico-iso-gratuito",
      "certificacion-iso-9001",
      "iso-45001-seguridad-borrador"
    )
  end
end
