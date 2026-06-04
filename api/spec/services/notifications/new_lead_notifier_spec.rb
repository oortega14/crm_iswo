# frozen_string_literal: true

require "rails_helper"

RSpec.describe Notifications::NewLeadNotifier do
  let(:tenant)      { ActsAsTenant.current_tenant }
  let(:owner)       { create(:user, :consultant, tenant: tenant, name: "Consultor") }
  let(:manager)     { create(:user, :manager, tenant: tenant, name: "Manager") }
  let(:pipeline)    { create(:pipeline_with_stages, tenant: tenant) }
  let(:contact)     { create(:contact, tenant: tenant, first_name: "Ana", last_name: "Ruiz") }
  let(:opportunity) do
    create(:opportunity,
           tenant: tenant,
           pipeline: pipeline,
           pipeline_stage: pipeline.pipeline_stages.first,
           contact: contact,
           owner_user: owner,
           title: "Lead Meta — Ana Ruiz")
  end

  it "notifica al dueño en lead entrante automático" do
    expect do
      expect(
        described_class.call(
          opportunity:  opportunity,
          source_kind:  "meta",
          source_label: "Campaña verano"
        )
      ).to be(true)
    end.to change { owner.notifications.kind_new_lead.count }.by(1)

    n = owner.notifications.kind_new_lead.last
    expect(n.title).to eq("Nuevo lead")
    expect(n.body).to include("Ana Ruiz")
    expect(n.body).to include("Campaña verano")
    expect(n.resource).to eq(opportunity)
  end

  it "notifica cuando otro usuario asigna el lead" do
    described_class.call(
      opportunity: opportunity,
      actor:       manager,
      source_kind: "manual"
    )

    n = owner.notifications.kind_new_lead.last
    expect(n.body).to include("Manager")
    expect(n.body).to include("te asignó")
  end

  it "no notifica si el actor es el mismo dueño" do
    expect do
      described_class.call(opportunity: opportunity, actor: owner, source_kind: "manual")
    end.not_to change(Notification, :count)
  end
end
