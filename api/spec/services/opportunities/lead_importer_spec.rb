# frozen_string_literal: true

require "rails_helper"

RSpec.describe Opportunities::LeadImporter do
  let(:tenant)      { ActsAsTenant.current_tenant }
  let!(:pipeline)   { create(:pipeline_with_stages, tenant: tenant, is_default: true) }
  let!(:_src)       { create(:lead_source, tenant: tenant, kind: "meta", name: "Meta Ads") }
  let!(:consultant) { create(:user, :consultant, tenant: tenant) }

  let(:attrs) do
    { "email" => "lead@test.co", "phone" => "3001234567", "full_name" => "Lead Test" }
  end

  subject(:importer) do
    described_class.new(tenant: tenant, attrs: attrs, source_kind: "meta")
  end

  describe "#call" do
    it "crea un contacto nuevo" do
      expect { importer.call }.to change { ActsAsTenant.with_tenant(tenant) { Contact.count } }.by(1)
    end

    it "crea una oportunidad vinculada al contacto" do
      result = importer.call
      expect(result.opportunity).to be_a(Opportunity)
      expect(result.opportunity.contact).to eq(result.contact)
    end

    it "el resultado no es duplicado cuando el contacto es nuevo" do
      result = importer.call
      expect(result.duplicate?).to be(false)
    end

    it "reutiliza el contacto existente si hay match por email" do
      existing = ActsAsTenant.with_tenant(tenant) do
        create(:contact, tenant: tenant, email: "lead@test.co", first_name: "Lead", last_name: "Test")
      end
      result = importer.call
      expect(result.contact.id).to eq(existing.id)
      expect(result.duplicate?).to be(true)
    end

    it "asigna la oportunidad al pipeline por defecto" do
      result = importer.call
      expect(result.opportunity.pipeline).to eq(pipeline)
    end

    it "usa round-robin para asignar owner" do
      result = importer.call
      expect(result.opportunity.owner_user).to be_present
    end

    it "acepta owner_user explícito" do
      result = described_class.new(tenant: tenant, attrs: attrs,
                                   source_kind: "meta", owner_user: consultant).call
      expect(result.opportunity.owner_user).to eq(consultant)
    end

    it "crea un OpportunityLog con action=create" do
      result = importer.call
      log = result.opportunity.opportunity_logs.last
      expect(log.action).to eq("create")
    end

    it "persiste custom_fields en la oportunidad" do
      result = described_class.new(
        tenant: tenant, attrs: attrs, source_kind: "meta",
        custom_fields: { "meta_lead_id" => "lead-001" }
      ).call
      expect(result.opportunity.custom_fields["meta_lead_id"]).to eq("lead-001")
    end
  end
end
