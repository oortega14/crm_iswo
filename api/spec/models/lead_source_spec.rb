# frozen_string_literal: true

require "rails_helper"

RSpec.describe LeadSource, type: :model do
  let(:tenant) { ActsAsTenant.current_tenant }

  subject(:ls) { build(:lead_source, tenant: tenant, name: "WhatsApp", kind: "whatsapp") }

  describe "validaciones" do
    it { is_expected.to be_valid }

    it "requiere name" do
      ls.name = nil
      expect(ls).not_to be_valid
      expect(ls.errors[:name]).to be_present
    end

    it "nombre único por tenant (case-insensitive)" do
      create(:lead_source, tenant: tenant, name: "WhatsApp", kind: "whatsapp")
      dup = build(:lead_source, tenant: tenant, name: "whatsapp", kind: "web")
      expect(dup).not_to be_valid
    end

    it "acepta el mismo nombre en tenants distintos" do
      other = create(:tenant, slug: "other-#{SecureRandom.hex(3)}")
      ActsAsTenant.with_tenant(other) { create(:lead_source, tenant: other, name: "WhatsApp", kind: "whatsapp") }
      expect(ls).to be_valid
    end

    it "requiere kind válido" do
      expect { ls.kind = "fax" }.to raise_error(ArgumentError)
    end

    it "acepta todos los kinds del enum" do
      %w[web whatsapp meta google manual referral].each do |k|
        ls.kind = k
        ls.name = "src #{k}"
        expect(ls).to be_valid
      end
    end
  end

  describe ".active scope" do
    it "devuelve solo sources activos" do
      active = create(:lead_source, tenant: tenant, name: "Activo", kind: "web", active: true)
      inactive = create(:lead_source, tenant: tenant, name: "Inactivo", kind: "meta", active: false)
      expect(LeadSource.active).to include(active)
      expect(LeadSource.active).not_to include(inactive)
    end
  end
end
