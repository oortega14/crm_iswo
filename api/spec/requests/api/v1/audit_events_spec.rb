# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::AuditEvents", type: :request do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:admin) { create(:user, :admin, tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }

  before do
    AuditEvent.create!(
      tenant:      tenant,
      user:        admin,
      action:      "login",
      entity_type: "User",
      entity_id:   admin.id,
      metadata:    { source: "rspec" },
      ip_address:  "127.0.0.1",
      user_agent:  "RSpec"
    )
  end

  describe "GET /api/v1/audit_events" do
    it "devuelve eventos del tenant para admin" do
      get "/api/v1/audit_events", headers: auth_headers(admin)
      expect(response).to have_http_status(:ok)
      expect(json["data"]).to be_an(Array)
      expect(json["data"].first.dig("attributes", "action")).to eq("login")
    end

    it "deniega a consultor" do
      get "/api/v1/audit_events", headers: auth_headers(consultant)
      expect(response).to have_http_status(:forbidden)
    end
  end
end
