# frozen_string_literal: true

require "rails_helper"

RSpec.describe Leads::DemoEnricher do
  let(:tenant) { create(:tenant, slug: "enrich-#{SecureRandom.hex(3)}") }

  before do
    ActsAsTenant.current_tenant = tenant
    admin = create(:user, :admin, tenant: tenant)
    consultant = create(:user, :consultant, tenant: tenant)
    pipeline = create(:pipeline_with_stages, tenant: tenant)
    pipeline.update!(is_default: true)
    contact = create(:contact, tenant: tenant, email: "demo.#{tenant.slug}.1@leads.iswo.test")
    create(:opportunity, tenant: tenant, contact: contact, owner_user: consultant, pipeline: pipeline,
           pipeline_stage: pipeline.pipeline_stages.first)
  end

  it "crea recordatorios y duplicate flags" do
    described_class.run!(tenant_slugs: [tenant.slug])

    expect(tenant.reminders.count).to be >= 1
    expect(tenant.duplicate_flags.resolution_pending.count).to be >= 1
  end
end
