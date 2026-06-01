# frozen_string_literal: true

require "rails_helper"

RSpec.describe Export, type: :model do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:user)   { create(:user, :admin, tenant: tenant) }

  subject(:export) { build(:export, tenant: tenant, user: user, resource: "contacts", format: "csv") }

  describe "validaciones" do
    it { is_expected.to be_valid }

    it "requiere resource válido" do
      expect { export.resource = "invoices" }.to raise_error(ArgumentError)
    end

    it "requiere format válido" do
      expect { export.format = "pdf" }.to raise_error(ArgumentError)
    end

    it "tiene status queued por defecto" do
      expect(export.status).to eq("queued")
    end
  end

  describe "#expired?" do
    it "es false cuando expires_at es futuro" do
      export.expires_at = 1.day.from_now
      expect(export.expired?).to be(false)
    end

    it "es true cuando expires_at es pasado" do
      export.expires_at = 1.day.ago
      expect(export.expired?).to be(true)
    end

    it "es false cuando expires_at es nil" do
      export.expires_at = nil
      expect(export.expired?).to be(false)
    end
  end

  describe ".active scope" do
    it "excluye exports expired y failed" do
      active  = create(:export, tenant: tenant, user: user, resource: "contacts", format: "csv", status: "succeeded")
      expired = create(:export, tenant: tenant, user: user, resource: "contacts", format: "csv", status: "expired")
      failed  = create(:export, tenant: tenant, user: user, resource: "contacts", format: "csv", status: "failed")
      expect(Export.active).to include(active)
      expect(Export.active).not_to include(expired, failed)
    end
  end

  describe ".expired scope" do
    it "devuelve exports con expires_at pasado" do
      old = create(:export, tenant: tenant, user: user, resource: "contacts", format: "csv",
                   status: "succeeded", expires_at: 2.days.ago)
      future = create(:export, tenant: tenant, user: user, resource: "contacts", format: "csv",
                      status: "succeeded", expires_at: 2.days.from_now)
      expect(Export.expired).to include(old)
      expect(Export.expired).not_to include(future)
    end
  end
end
