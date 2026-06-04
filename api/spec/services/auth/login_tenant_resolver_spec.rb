# frozen_string_literal: true

require "rails_helper"

RSpec.describe Auth::LoginTenantResolver do
  let(:tenant) { ActsAsTenant.current_tenant }

  describe ".call" do
    it "resuelve por slug explícito" do
      result = described_class.call(slug: tenant.slug, email: "x@y.co")
      expect(result.status).to eq(:ok)
      expect(result.tenant.id).to eq(tenant.id)
    end

    it "prioriza el tenant del correo sobre un slug incorrecto en header" do
      user = create(:user, tenant: tenant, email: "admin@iswo.local", password: "secret12345")
      other = ActsAsTenant.without_tenant { create(:tenant, slug: "micasita-#{SecureRandom.hex(2)}") }

      result = described_class.call(slug: other.slug, email: user.email)
      expect(result.status).to eq(:ok)
      expect(result.tenant.id).to eq(tenant.id)
    end

    it "resuelve por email sin slug" do
      user = create(:user, tenant: tenant, email: "solo@empresa.co", password: "secret12345")
      result = described_class.call(slug: nil, email: user.email)
      expect(result.status).to eq(:ok)
      expect(result.tenant.id).to eq(tenant.id)
    end

    it "marca ambiguous si el correo existe en dos tenants" do
      other = ActsAsTenant.without_tenant { create(:tenant, slug: "otro-login-#{SecureRandom.hex(2)}") }
      email = "dup@multi.co"
      create(:user, tenant: tenant, email: email, password: "secret12345")
      ActsAsTenant.with_tenant(other) { create(:user, tenant: other, email: email, password: "secret12345") }

      result = described_class.call(slug: nil, email: email)
      expect(result.status).to eq(:ambiguous)
      expect(result.tenants.map { |t| t[:slug] }).to include(tenant.slug, other.slug)
    end
  end
end
