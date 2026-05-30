# frozen_string_literal: true

require "rails_helper"

# ============================================================================
# Cobertura de auditoría CRUD — entidades clave registran AuditEvent
# ============================================================================
RSpec.describe "Audit CRUD coverage", type: :request do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:admin)  { create(:user, :admin, tenant: tenant) }

  it "Reminder create → AuditEvent" do
    opportunity = create(:opportunity, tenant: tenant, owner_user: admin)

    expect {
      post "/api/v1/opportunities/#{opportunity.id}/reminders",
           params:  {
             reminder: {
               remind_at: 1.day.from_now.iso8601,
               channel:   "in_app",
               subject:   "Coverage",
               message:   "Test"
             }
           }.to_json,
           headers: auth_headers(admin)
    }.to change(AuditEvent, :count).by(1)

    expect(AuditEvent.last.entity_type).to eq("Reminder")
  end

  it "ReferralNetwork create → AuditEvent" do
    referrer = create(:user, :consultant, tenant: tenant)
    referred = create(:user, :consultant, tenant: tenant)

    expect {
      post "/api/v1/referral_networks",
           params:  { referral_network: { referrer_user_id: referrer.id, referred_user_id: referred.id } }.to_json,
           headers: auth_headers(admin)
    }.to change(AuditEvent, :count).by(1)

    expect(AuditEvent.last.entity_type).to eq("ReferralNetwork")
  end

  it "Contact update → audit_contact! (no duplicado del concern)" do
    contact = create(:contact, tenant: tenant)
    initial = AuditEvent.count

    patch "/api/v1/contacts/#{contact.id}",
          params: { contact: { first_name: "Audit" } }.to_json,
          headers: auth_headers(admin)

    expect(AuditEvent.count - initial).to eq(1)
    expect(AuditEvent.last.action).to eq("contact.update")
  end
end
