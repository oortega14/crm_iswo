# frozen_string_literal: true

require "rails_helper"

RSpec.describe Landings::TenantSetup do
  let(:tenant) { ActsAsTenant.current_tenant }

  describe ".apply!" do
    before { tenant.landing_pages.destroy_all }

    it "no crea plantillas en verticales F5 (iswo)" do
      iswo = create(:tenant, :iswo)
      create(:landing_page, tenant: iswo, slug: "diagnostico-iso-gratuito", title: "Vieja plantilla")

      expect { described_class.apply!(iswo) }
        .to change { iswo.landing_pages.count }.from(1).to(0)
    end

    it "crea 2 landings genéricas para tenants fuera de F5" do
      other = create(:tenant, slug: "acme-corp", name: "ACME")
      expect { described_class.apply!(other) }
        .to change { LandingPage.unscoped.where(tenant: other).count }.from(0).to(2)
      expect(other.reload.landing_pages.pluck(:slug))
        .to contain_exactly("captura-leads", "campana-proxima")
    end

    it "activa módulo landings en settings" do
      tenant.update!(settings: { "modules" => %w[opportunities] })
      described_class.apply!(tenant)
      expect(tenant.reload.settings["modules"]).to include("landings")
    end
  end
end
