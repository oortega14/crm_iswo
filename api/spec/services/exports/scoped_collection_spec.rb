# frozen_string_literal: true

require "rails_helper"

RSpec.describe Exports::ScopedCollection do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:admin)      { create(:user, :admin,   tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let(:pipeline)   { create(:pipeline_with_stages, tenant: tenant) }
  let(:contact)    { create(:contact, tenant: tenant, first_name: "Export") }
  let!(:opp) do
    create(:opportunity, tenant: tenant, contact: contact,
           pipeline: pipeline, pipeline_stage: pipeline.pipeline_stages.first,
           owner_user: consultant)
  end

  describe "#resolve para contacts" do
    let!(:contact2) { create(:contact, tenant: tenant, first_name: "Otro") }

    it "admin ve todos los contactos del tenant" do
      scope = described_class.new(user: admin, resource: "contacts").resolve
      expect(scope.map(&:id)).to include(contact.id, contact2.id)
    end

    it "filtra contactos por kind con Ransack" do
      person = create(:contact, tenant: tenant, kind: "person", first_name: "Persona")
      create(:contact, :company, tenant: tenant, company_name: "Empresa SA")

      scope = described_class.new(
        user: admin,
        resource: "contacts",
        filters: { "kind_eq" => "person" }
      ).resolve

      expect(scope.map(&:id)).to include(person.id)
      expect(scope.where(kind: "company").count).to eq(0)
    end

    it "filtra contactos por etapa del pipeline de sus oportunidades (RFC §6.7)" do
      other_stage = pipeline.pipeline_stages.second
      other_contact = create(:contact, tenant: tenant, first_name: "En otra etapa")
      create(:opportunity, tenant: tenant, contact: other_contact,
             pipeline: pipeline, pipeline_stage: other_stage, owner_user: consultant)

      scope = described_class.new(
        user: admin,
        resource: "contacts",
        filters: { "opportunities_pipeline_stage_id_eq" => opp.pipeline_stage_id.to_s }
      ).resolve

      expect(scope.map(&:id)).to include(contact.id)
      expect(scope.map(&:id)).not_to include(other_contact.id)
    end

    it "no duplica un contacto con varias oportunidades en la misma etapa" do
      create(:opportunity, tenant: tenant, contact: contact,
             pipeline: pipeline, pipeline_stage: opp.pipeline_stage, owner_user: consultant)

      scope = described_class.new(
        user: admin,
        resource: "contacts",
        filters: { "opportunities_pipeline_stage_id_eq" => opp.pipeline_stage_id.to_s }
      ).resolve

      expect(scope.map(&:id).count { |id| id == contact.id }).to eq(1)
    end
  end

  describe "#resolve para opportunities" do
    it "admin ve todas las oportunidades" do
      scope = described_class.new(user: admin, resource: "opportunities").resolve
      expect(scope.map(&:id)).to include(opp.id)
    end

    it "consultant ve solo sus oportunidades" do
      other_opp = create(:opportunity, tenant: tenant, contact: contact,
                         pipeline: pipeline, pipeline_stage: pipeline.pipeline_stages.first,
                         owner_user: admin)
      scope = described_class.new(user: consultant, resource: "opportunities").resolve
      expect(scope.map(&:id)).to include(opp.id)
      expect(scope.map(&:id)).not_to include(other_opp.id)
    end
  end

  describe "recurso inválido" do
    it "lanza ArgumentError" do
      expect {
        described_class.new(user: admin, resource: "invoices").resolve
      }.to raise_error(ArgumentError, /Recurso no soportado/)
    end
  end
end
