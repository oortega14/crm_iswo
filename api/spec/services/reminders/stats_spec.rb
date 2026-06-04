# frozen_string_literal: true

require "rails_helper"

RSpec.describe Reminders::Stats do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let(:opportunity) { create(:opportunity, tenant: tenant, owner_user: consultant) }

  it "cuenta solo recordatorios visibles para el consultor" do
    create(:reminder, tenant: tenant, user: consultant, opportunity: opportunity,
           status: "pending", remind_at: 1.hour.ago)
    other = create(:user, :consultant, tenant: tenant)
    other_opp = create(:opportunity, tenant: tenant, owner_user: other)
    create(:reminder, tenant: tenant, user: other, opportunity: other_opp, status: "pending")

    payload = described_class.new(user: consultant).call

    expect(payload[:pending]).to eq(1)
    expect(payload[:overdue]).to eq(1)
  end
end
