# frozen_string_literal: true

require "rails_helper"

RSpec.describe DailyBriefingJob, type: :job do
  include ActiveJob::TestHelper

  let(:tenant) { ActsAsTenant.current_tenant }
  let(:user) { create(:user, :admin, tenant: tenant, email: "job-briefing@example.com") }
  let!(:pipeline) { create(:pipeline, tenant: tenant, is_default: true) }
  let!(:stage) { create(:pipeline_stage, pipeline: pipeline, tenant: tenant, position: 1) }

  before do
    create(:opportunity, tenant: tenant, pipeline: pipeline, pipeline_stage: stage, owner_user: user)
  end

  it "encola correos de briefing para usuarios con oportunidades abiertas" do
    expect do
      perform_enqueued_jobs(only: ActionMailer::MailDeliveryJob) do
        described_class.perform_now
      end
    end.to change { ActionMailer::Base.deliveries.size }.by_at_least(1)

    expect(ActionMailer::Base.deliveries.map(&:to).flatten).to include(user.email)
  end
end
