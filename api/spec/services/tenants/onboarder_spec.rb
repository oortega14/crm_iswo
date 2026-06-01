# frozen_string_literal: true

require "rails_helper"

RSpec.describe Tenants::Onboarder do
  let(:slug)  { "onboard-test-#{SecureRandom.hex(4)}" }

  subject(:onboarder) do
    described_class.new(
      slug:           slug,
      name:           "Tenant Onboard Test",
      admin_email:    "admin@#{slug}.co",
      admin_name:     "Admin Test",
      admin_password: "SecurePass123!"
    )
  end

  describe "#call" do
    it "crea el tenant, usuario admin y pipeline por defecto" do
      result = onboarder.call

      expect(result.tenant).to be_a(Tenant)
      expect(result.tenant.slug).to eq(slug)
      expect(result.admin_user.role).to eq("admin")
      expect(result.pipeline).to be_a(Pipeline)
      expect(result.pipeline.is_default).to be(true)
    end

    it "crea las 6 etapas por defecto en el pipeline" do
      result = onboarder.call
      stage_count = ActsAsTenant.with_tenant(result.tenant) { result.pipeline.pipeline_stages.count }
      names       = ActsAsTenant.with_tenant(result.tenant) { result.pipeline.pipeline_stages.pluck(:name) }
      expect(stage_count).to eq(6)
      expect(names).to include("Nueva", "Calificada", "Ganada", "Perdida")
    end

    it "crea las fuentes de lead por defecto" do
      result = onboarder.call
      ActsAsTenant.with_tenant(result.tenant) do
        kinds = LeadSource.pluck(:kind)
        expect(kinds).to include("web", "whatsapp", "meta", "google", "referral", "manual")
      end
    end

    it "crea criterio BANT" do
      result = onboarder.call
      expect(result.tenant.bant_criterion).to be_present
    end

    context "vertical libranzas", :without_tenant do
      it "crea campos personalizados de la vertical" do
        result = described_class.new(
          slug: "libranzas", name: "Libranzas", admin_email: "admin@libranzas.co",
          admin_name: "Admin", admin_password: "SecurePass123!"
        ).call
        ActsAsTenant.with_tenant(result.tenant) do
          keys = TenantFieldDefinition.pluck(:key)
          expect(keys).to include("empleador_nombre", "salario_base")
        end
      end
    end

    context "vertical micasita", :without_tenant do
      it "crea campos personalizados de la vertical" do
        result = described_class.new(
          slug: "micasita", name: "Mi Casita", admin_email: "admin@micasita.co",
          admin_name: "Admin", admin_password: "SecurePass123!"
        ).call
        ActsAsTenant.with_tenant(result.tenant) do
          keys = TenantFieldDefinition.pluck(:key)
          expect(keys).to include("tipo_inmueble", "valor_comercial")
        end
      end
    end

    it "es atómico — rollback completo si algo falla" do
      allow(LeadSource).to receive(:create!).and_raise(ActiveRecord::RecordInvalid)
      slug_before = Tenant.count
      expect { onboarder.call }.to raise_error(ActiveRecord::RecordInvalid)
      expect(Tenant.count).to eq(slug_before) # no quedó registro parcial
    end
  end
end
