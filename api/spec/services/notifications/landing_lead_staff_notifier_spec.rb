# frozen_string_literal: true

require "rails_helper"

RSpec.describe Notifications::LandingLeadStaffNotifier do
  let(:tenant)      { ActsAsTenant.current_tenant }
  let(:admin)       { create(:user, :admin, tenant: tenant) }
  let(:manager)     { create(:user, :manager, tenant: tenant) }
  let(:consultant)  { create(:user, :consultant, tenant: tenant) }
  let(:pipeline)    { create(:pipeline_with_stages, tenant: tenant) }
  let(:contact)     { create(:contact, tenant: tenant) }
  let(:opp) do
    create(:opportunity, tenant: tenant, contact: contact, owner_user: consultant,
           pipeline: pipeline, pipeline_stage: pipeline.pipeline_stages.first)
  end
  let(:landing) { create(:landing_page, tenant: tenant, title: "MICASAYA") }

  it "notifica a admin y manager (no al consultor asignado)" do
    admin
    manager

    expect do
      described_class.call(opportunity: opp, landing: landing)
    end.to change { Notification.unscoped.kind_new_lead.count }.by(2)

    expect(admin.notifications.kind_new_lead.last.body).to include("MICASAYA")
    expect(consultant.notifications.kind_new_lead.count).to eq(0)
  end
end
