# frozen_string_literal: true

require "rails_helper"

RSpec.describe AuditLogger do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:admin)  { create(:user, :admin, tenant: tenant) }
  let(:contact) { create(:contact, tenant: tenant, email: "secret@iswo.co") }

  it "persiste AuditEvent con metadata sanitizada" do
    expect {
      described_class.record_entity!(
        tenant:       tenant,
        user:         admin,
        action:       "contact.update",
        entity:       contact,
        metadata:     { email: contact.email, changed_fields: %w[first_name] },
        ip_address:   "127.0.0.1",
        user_agent:   "rspec"
      )
    }.to change(AuditEvent, :count).by(1)

    event = AuditEvent.last
    expect(event.ip_address).to eq("127.0.0.1")
    expect(event.metadata["email"]).to eq("[REDACTED]")
    expect(event.metadata["changed_fields"]).to eq(%w[first_name])
  end
end
