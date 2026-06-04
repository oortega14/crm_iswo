# frozen_string_literal: true

require "rails_helper"

RSpec.describe Notifications::DuplicateCollisionNotifier do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:admin)      { create(:user, :admin, tenant: tenant) }
  let(:manager)    { create(:user, :manager, tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let(:registrar)  { create(:user, :consultant, tenant: tenant) }

  let(:pipeline) { create(:pipeline_with_stages, tenant: tenant) }
  let(:stage)    { pipeline.pipeline_stages.first }
  let(:contact)  { create(:contact, tenant: tenant) }

  let!(:existing_opp) do
    create(:opportunity, tenant: tenant, pipeline: pipeline, pipeline_stage: stage,
           contact: contact, owner_user: consultant)
  end
  let!(:new_opp) do
    create(:opportunity, tenant: tenant, pipeline: pipeline, pipeline_stage: stage,
           contact: contact, owner_user: registrar)
  end
  let!(:flag) do
    create(:duplicate_flag, tenant: tenant, opportunity: new_opp,
           duplicate_of_opportunity: existing_opp, detected_by_user: registrar)
  end

  it "notifica a admin y manager del tenant" do
    expect {
      described_class.call(
        tenant: tenant, flag: flag, existing_opp: existing_opp, registrar: registrar
      )
    }.to change { admin.notifications.kind_duplicate_found.count }.by(1)
      .and change { manager.notifications.kind_duplicate_found.count }.by(1)
  end

  it "notifica al dueño distinto del registrador" do
    expect {
      described_class.call(
        tenant: tenant, flag: flag, existing_opp: existing_opp, registrar: registrar
      )
    }.to change { consultant.notifications.kind_duplicate_found.count }.by(1)
  end
end
