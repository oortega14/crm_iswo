# frozen_string_literal: true

require "rails_helper"

RSpec.describe Landings::TenantSetup do
  let(:tenant) { ActsAsTenant.current_tenant }

  describe ".apply!" do
    before { tenant.landing_pages.destroy_all }

    it "crea 3 landings ISO para ISWO (2 publicadas, 1 borrador)" do
      iswo = create(:tenant, :iswo)
      create(:landing_page, tenant: iswo, slug: "landing-vieja", title: "Vieja extra")

      expect { described_class.apply!(iswo) }
        .to change { iswo.landing_pages.count }.from(1).to(3)

      slugs = iswo.landing_pages.pluck(:slug)
      expect(slugs).to contain_exactly(
        "diagnostico-iso-gratuito",
        "certificacion-iso-9001",
        "iso-45001-seguridad-borrador"
      )
      expect(iswo.landing_pages.published.count).to eq(2)
      expect(iswo.landing_pages.find_by!(slug: "iso-45001-seguridad-borrador").published).to be(false)
    end

    it "crea 3 landings para Libranzas (2 publicadas, 1 borrador)" do
      libranzas = create(:tenant, slug: "libranzas", name: "Libranzas ISWO")
      create(:landing_page, tenant: libranzas, slug: "campana-extra", title: "Extra")

      expect { described_class.apply!(libranzas) }
        .to change { libranzas.landing_pages.count }.from(1).to(3)

      slugs = libranzas.landing_pages.pluck(:slug)
      expect(slugs).to contain_exactly(
        "solicitud-libranza",
        "credito-libre-inversion",
        "compra-cartera-borrador"
      )
      expect(libranzas.landing_pages.published.count).to eq(2)
      expect(libranzas.landing_pages.find_by!(slug: "compra-cartera-borrador").published).to be(false)
    end

    it "crea 3 landings Pasto para Mi Casita (2 publicadas, 1 borrador)" do
      micasita = create(:tenant, slug: "micasita", name: "Mi Casita")

      expect { described_class.apply!(micasita) }
        .to change { LandingPage.unscoped.where(tenant: micasita).count }.from(0).to(3)

      slugs = micasita.landing_pages.pluck(:slug)
      expect(slugs).to contain_exactly(
        "apartamentos-pasto",
        "credito-vivienda-pasto",
        "proyecto-nuevo-pasto-borrador"
      )
      expect(micasita.landing_pages.published.count).to eq(2)
      expect(micasita.landing_pages.find_by!(slug: "proyecto-nuevo-pasto-borrador").published).to be(false)
      expect(micasita.landing_pages.first.content["fields"].size).to eq(4)
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
