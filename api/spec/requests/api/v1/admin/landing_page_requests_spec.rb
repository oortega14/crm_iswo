# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Admin::LandingPageRequests", type: :request do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:manager) { create(:user, :manager, tenant: tenant) }

  let!(:platform_result) do
    ActsAsTenant.without_tenant { Tenants::PlatformSeeder.call! }
  end
  let(:platform) { platform_result.tenant }
  let(:platform_admin) { platform_result.admin_user }

  let!(:pending_landing) do
    create(:landing_page, tenant: tenant, slug: "pendiente", requested_by_user_id: manager.id)
  end

  def platform_headers(user = platform_admin)
    auth_headers(user, tenant: platform)
  end

  describe "GET /api/v1/admin/landing_page_requests" do
    it "lista solicitudes pendientes cross-tenant" do
      get "/api/v1/admin/landing_page_requests", headers: platform_headers
      expect(response).to have_http_status(:ok)

      slugs = json["data"].map { |row| row["slug"] }
      expect(slugs).to include("pendiente")

      row = json["data"].find { |r| r["slug"] == "pendiente" }
      expect(row.dig("tenant", "slug")).to eq(tenant.slug)
      expect(row.dig("requested_by", "id")).to eq(manager.id)
    end

    it "deniega a un admin comercial que no es del tenant plataforma" do
      commercial_admin = create(:user, :admin, tenant: tenant)
      get "/api/v1/admin/landing_page_requests", headers: auth_headers(commercial_admin)
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "POST /api/v1/admin/landing_page_requests/:id/approve" do
    it "aprueba, publica y notifica al solicitante en su propio tenant" do
      expect {
        post "/api/v1/admin/landing_page_requests/#{pending_landing.id}/approve", headers: platform_headers
      }.to change { manager.notifications.where(kind: "landing_request_approved").count }.by(1)

      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "approval_status")).to eq("approved")

      reloaded = ActsAsTenant.without_tenant { LandingPage.find(pending_landing.id) }
      expect(reloaded.published).to be(true)
      expect(reloaded.reviewed_by_user_id).to eq(platform_admin.id)
    end
  end

  describe "POST /api/v1/admin/landing_page_requests/:id/reject" do
    it "rechaza con motivo y notifica al solicitante" do
      expect {
        post "/api/v1/admin/landing_page_requests/#{pending_landing.id}/reject",
             headers: platform_headers,
             params: { rejection_reason: "Falta información de contacto" }.to_json
      }.to change { manager.notifications.where(kind: "landing_request_rejected").count }.by(1)

      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "approval_status")).to eq("rejected")
      expect(json.dig("data", "rejection_reason")).to eq("Falta información de contacto")

      reloaded = ActsAsTenant.without_tenant { LandingPage.find(pending_landing.id) }
      expect(reloaded.published).to be(false)
    end
  end
end
