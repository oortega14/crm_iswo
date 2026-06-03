# frozen_string_literal: true

require "rails_helper"

RSpec.describe Contacts::ProspectOpportunityCreator do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let!(:pipeline)  { create(:pipeline_with_stages, tenant: tenant, is_default: true) }
  let!(:source)    { create(:lead_source, tenant: tenant, kind: "manual") }

  it "crea oportunidad new_lead si el contacto no tiene una abierta" do
    contact = create(:contact, tenant: tenant, owner_user: consultant)

    expect {
      described_class.call(contact: contact, actor: consultant)
    }.to change(Opportunity, :count).by(1)

    opp = contact.opportunities.last
    expect(opp.status).to eq("new_lead")
    expect(opp.owner_user).to eq(consultant)
  end

  it "no duplica si ya hay oportunidad abierta" do
    contact = create(:contact, tenant: tenant, owner_user: consultant)
    create(:opportunity, tenant: tenant, contact: contact, owner_user: consultant,
           pipeline: pipeline, pipeline_stage: pipeline.pipeline_stages.first)

    expect {
      described_class.call(contact: contact, actor: consultant)
    }.not_to change(Opportunity, :count)
  end
end
