# frozen_string_literal: true

require "rails_helper"

RSpec.describe DuplicateFlags::Stats do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:manager) { create(:user, :manager, tenant: tenant) }

  it "cuenta flags pending y total del tenant" do
    create(:duplicate_flag, tenant: tenant, resolution: "pending")
    create(:duplicate_flag, tenant: tenant, resolution: "ignored")

    payload = described_class.new(user: manager).call

    expect(payload[:pending]).to eq(1)
    expect(payload[:total]).to be >= 2
  end
end
