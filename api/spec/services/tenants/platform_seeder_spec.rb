# frozen_string_literal: true

require "rails_helper"

RSpec.describe Tenants::PlatformSeeder do
  it "crea el tenant super-admin y su administrador" do
    ActsAsTenant.without_tenant do
      expect(Tenant.find_by(slug: PlatformTenant::SLUG)).to be_nil
    end

    result = described_class.call!

    expect(result.created).to be true
    expect(result.tenant.slug).to eq("super-admin")
    expect(result.admin_user.role).to eq("admin")
    expect(result.admin_user.email).to eq("admin@super-admin.local")
    expect(result.tenant.settings["platform_tenant"]).to be true
  end

  it "es idempotente" do
    described_class.call!
    result = described_class.call!

    expect(result.created).to be false
    expect(Tenant.where(slug: PlatformTenant::SLUG).count).to eq(1)
  end
end
