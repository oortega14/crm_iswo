# frozen_string_literal: true

require "rails_helper"

RSpec.describe Ads::MetaLeadProcessor do
  let(:tenant)       { ActsAsTenant.current_tenant }
  let!(:pipeline)    { create(:pipeline_with_stages, tenant: tenant, is_default: true) }
  let!(:_lead_src)   { create(:lead_source, tenant: tenant, kind: "meta", name: "Meta Ads") }
  let!(:_consultant) { create(:user, :consultant, tenant: tenant) }
  let(:integration) do
    create(:ad_integration, tenant: tenant, provider: "meta",
           account_identifier: "12345678",
           credentials: { "access_token" => "fake-token" },
           status: "active")
  end

  let(:payload) do
    {
      "leadgen_id" => "lead-001",
      "page_id"    => integration.account_identifier,
      "ad_id"      => "ad-abc",
      "form_id"    => "form-xyz",
      "campaign_id" => "camp-001"
    }
  end

  let(:graph_response) do
    {
      "field_data" => [
        { "name" => "full_name",     "values" => ["Ana García"] },
        { "name" => "email",         "values" => ["ana@test.co"] },
        { "name" => "phone_number",  "values" => ["3001234567"] }
      ],
      "form_id" => "form-xyz"
    }
  end

  before do
    integration
    allow_any_instance_of(Faraday::Connection).to receive(:get).and_return(
      instance_double(Faraday::Response, success?: true, body: graph_response)
    )
  end

  describe "#call" do
    it "crea un contacto y una oportunidad en el tenant" do
      expect {
        described_class.new(payload).call
      }.to change { ActsAsTenant.with_tenant(tenant) { Contact.count } }.by(1)
       .and change { ActsAsTenant.with_tenant(tenant) { Opportunity.count } }.by(1)
    end

    it "devuelve un Result con tenant, contact y opportunity" do
      result = described_class.new(payload).call
      expect(result.tenant).to eq(tenant)
      expect(result.contact).to be_a(Contact)
      expect(result.opportunity).to be_a(Opportunity)
    end

    it "la oportunidad tiene source kind=meta" do
      result = described_class.new(payload).call
      expect(result.opportunity.lead_source&.kind).to eq("meta")
    end

    it "lanza error si no encuentra integración para page_id" do
      bad_payload = payload.merge("page_id" => "unknown-page")
      expect {
        described_class.new(bad_payload).call
      }.to raise_error(ActiveRecord::RecordNotFound)
    end

    it "lanza error si page_id está ausente" do
      expect {
        described_class.new(payload.except("page_id")).call
      }.to raise_error(ArgumentError, /page_id/)
    end
  end
end
