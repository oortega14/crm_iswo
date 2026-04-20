# frozen_string_literal: true

require "rails_helper"

RSpec.describe AdIntegration, type: :model do
  let(:tenant) { ActsAsTenant.current_tenant }
  subject { build(:ad_integration, :meta, tenant: tenant) }

  describe "asociaciones" do
    it { is_expected.to belong_to(:tenant) }
  end

  describe "validaciones" do
    it { is_expected.to validate_inclusion_of(:provider).in_array(AdIntegration::PROVIDERS) }
    it { is_expected.to validate_inclusion_of(:status).in_array(AdIntegration::STATUSES) }

    it "valida unicidad del provider por tenant" do
      create(:ad_integration, :meta, tenant: tenant)
      duplicate = build(:ad_integration, :meta, tenant: tenant)
      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:provider]).to be_present
    end

    it "permite el mismo provider en tenants distintos", :without_tenant do
      t1 = create(:tenant, slug: "t1")
      t2 = create(:tenant, slug: "t2")
      ActsAsTenant.with_tenant(t1) { create(:ad_integration, :meta, tenant: t1) }
      ActsAsTenant.with_tenant(t2) { expect(build(:ad_integration, :meta, tenant: t2)).to be_valid }
    end
  end

  describe "enums" do
    it "tiene default status=active" do
      expect(AdIntegration.new.status).to eq("active")
    end

    it "expone predicates prefijados" do
      integration = build(:ad_integration, :meta, tenant: tenant, status: "paused")
      expect(integration.status_paused?).to be(true)
      expect(integration.status_active?).to be(false)
      expect(integration.provider_meta?).to be(true)
    end
  end

  describe "credentials cifrados" do
    it "persiste credentials como Hash y no expone en plano" do
      creds = { "access_token" => "secret-token", "account_id" => "act_123" }
      integration = create(:ad_integration, :meta, tenant: tenant, credentials: creds)
      integration.reload
      expect(integration.credentials).to eq(creds)
      # el ciphertext debe existir y ser distinto al valor en claro
      expect(integration.credentials_ciphertext).to be_present
      expect(integration.credentials_ciphertext).not_to include("secret-token")
    end
  end

  describe "scopes" do
    it ".healthy devuelve solo status_active" do
      active  = create(:ad_integration, :meta,   tenant: tenant)
      paused  = create(:ad_integration, :google, tenant: tenant, status: "paused")

      expect(AdIntegration.healthy).to include(active)
      expect(AdIntegration.healthy).not_to include(paused)
    end
  end

  describe "#record_sync!" do
    it "marca status=active y actualiza last_sync_at / limpia errores" do
      integration = create(:ad_integration, :meta, tenant: tenant,
                                                   status: "error",
                                                   last_error_at: 1.hour.ago,
                                                   last_error_message: "ups")
      integration.record_sync!
      expect(integration.reload.status).to eq("active")
      expect(integration.last_sync_at).to be_present
      expect(integration.last_error_at).to be_nil
      expect(integration.last_error_message).to be_nil
    end
  end

  describe "#record_failure!" do
    it "marca status=error y persiste mensaje truncado" do
      integration = create(:ad_integration, :meta, tenant: tenant)
      integration.record_failure!("token expirado " * 100)
      expect(integration.reload.status).to eq("error")
      expect(integration.last_error_at).to be_present
      expect(integration.last_error_message.length).to be <= 500
    end
  end
end
