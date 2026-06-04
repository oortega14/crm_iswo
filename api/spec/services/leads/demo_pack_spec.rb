# frozen_string_literal: true

require "rails_helper"

RSpec.describe Leads::DemoPack do
  let(:tenant) { create(:tenant, slug: "demo-pack-#{SecureRandom.hex(3)}") }

  before do
    ActsAsTenant.current_tenant = tenant
    create(:user, :admin, tenant: tenant)
    create(:user, :consultant, tenant: tenant, email: "c1@#{tenant.slug}.test")
    create(:user, :consultant, tenant: tenant, email: "c2@#{tenant.slug}.test")
    pipeline = create(:pipeline_with_stages, tenant: tenant, is_default: true)
    pipeline.update!(is_default: true)
    %w[meta web google manual].each { |k| create(:lead_source, tenant: tenant, kind: k) }
  end

  it "crea 5 oportunidades, recordatorios y flags de duplicado" do
    described_class.run!(tenant_slugs: [tenant.slug], batch_stamp: 99_001)

    expect(tenant.opportunities.count).to eq(5)
    expect(tenant.reminders.count).to eq(5)
    expect(tenant.duplicate_flags.resolution_pending.count).to eq(2)

    owners = tenant.opportunities.pluck(:owner_user_id).uniq
    expect(owners.size).to be >= 1
  end
end
