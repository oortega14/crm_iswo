# frozen_string_literal: true

require "rails_helper"

RSpec.describe Ads::GoogleLeadProcessor do
  let(:tenant)       { ActsAsTenant.current_tenant }
  let!(:pipeline)    { create(:pipeline_with_stages, tenant: tenant, is_default: true) }
  let!(:_lead_src)   { create(:lead_source, tenant: tenant, kind: "google", name: "Google Ads") }
  let!(:_consultant) { create(:user, :consultant, tenant: tenant) }
  let(:integration) do
    create(:ad_integration, tenant: tenant, provider: "google",
           account_identifier: "google-acct",
           credentials: { "access_token" => "fake" },
           status: "active",
           metadata: { "form_id" => "form-google-001" })
  end

  let(:payload) do
    {
      "lead_id"    => "g-lead-001",
      "form_id"    => "form-google-001",
      "campaign_id" => "g-camp-001",
      "gcl_id"     => "gcl-abc",
      "user_column_data" => [
        { "column_id" => "FULL_NAME",    "string_value" => "Carlos López" },
        { "column_id" => "EMAIL",        "string_value" => "carlos@test.co" },
        { "column_id" => "PHONE_NUMBER", "string_value" => "3119876543" }
      ]
    }
  end

  before { integration }

  describe "#call" do
    it "crea contacto y oportunidad" do
      expect {
        described_class.new(payload).call
      }.to change { ActsAsTenant.with_tenant(tenant) { Contact.count } }.by(1)
       .and change { ActsAsTenant.with_tenant(tenant) { Opportunity.count } }.by(1)
    end

    it "devuelve Result con tenant, contact y opportunity" do
      result = described_class.new(payload).call
      expect(result.tenant).to eq(tenant)
      expect(result.contact).to be_a(Contact)
      expect(result.opportunity).to be_a(Opportunity)
    end

    it "extrae columnas del payload correctamente" do
      result = described_class.new(payload).call
      expect(result.contact.email).to eq("carlos@test.co")
    end

    it "usa la integración activa disponible cuando el form_id coincide" do
      # Solo puede haber una integración google por tenant (uniqueness)
      result = described_class.new(payload).call
      expect(result.tenant).to eq(tenant)
    end

    it "lanza error si no hay ninguna integración google activa" do
      integration.update!(status: "paused")
      expect {
        described_class.new(payload).call
      }.to raise_error(ArgumentError, /google/)
    end
  end
end
