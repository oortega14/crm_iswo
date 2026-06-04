# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Admin::Tenants", type: :request do
  let(:default_tenant) { ActsAsTenant.current_tenant }
  let(:commercial_admin) { create(:user, :admin, tenant: default_tenant) }

  let!(:platform_result) do
    ActsAsTenant.without_tenant { Tenants::PlatformSeeder.call! }
  end
  let(:platform) { platform_result.tenant }
  let(:platform_admin) { platform_result.admin_user }

  def platform_headers(user = platform_admin)
    auth_headers(user, tenant: platform)
  end

  describe "GET /api/v1/admin/tenants" do
    it "lista tenants para admin de super-admin" do
      get "/api/v1/admin/tenants", headers: platform_headers
      expect(response).to have_http_status(:ok)
      expect(json["data"]).to be_an(Array)
      slugs = json["data"].map { |row| row["slug"] }
      expect(slugs).to include(platform.slug, default_tenant.slug)
    end

    it "deniega admin comercial de otro tenant" do
      get "/api/v1/admin/tenants", headers: auth_headers(commercial_admin)
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "POST /api/v1/admin/tenants" do
    it "crea tenant y devuelve contraseña generada" do
      slug = "onboard-req-#{SecureRandom.hex(3)}"
      post "/api/v1/admin/tenants",
           params: {
             tenant: {
               slug:         slug,
               name:         "Tenant Request Spec",
               admin_email:  "admin@#{slug}.co",
               admin_name:   "Admin",
               vertical:     "generic"
             }
           }.to_json,
           headers: platform_headers

      expect(response).to have_http_status(:created)
      expect(json.dig("data", "slug")).to eq(slug)
      expect(json.dig("data", "password_generated")).to be(true)
      expect(json.dig("data", "generated_admin_password")).to be_present
      expect(json.dig("data", "generated_admin_password").length).to be >= 12
    end

    it "no devuelve contraseña si el admin la indicó" do
      slug = "onboard-pwd-#{SecureRandom.hex(3)}"
      post "/api/v1/admin/tenants",
           params: {
             tenant: {
               slug:            slug,
               name:            "Tenant Con Password",
               admin_email:     "admin@#{slug}.co",
               admin_name:      "Admin",
               admin_password:  "MySecurePass123!",
               vertical:        "generic"
             }
           }.to_json,
           headers: platform_headers

      expect(response).to have_http_status(:created)
      expect(json.dig("data", "password_generated")).to be(false)
      expect(json.dig("data", "generated_admin_password")).to be_nil
    end
  end

  describe "PATCH /api/v1/admin/tenants/:id" do
    let!(:managed_tenant) do
      ActsAsTenant.without_tenant do
        Tenants::Onboarder.new(
          slug:           "toggle-#{SecureRandom.hex(3)}",
          name:           "Toggle Tenant",
          admin_email:    "toggle-#{SecureRandom.hex(3)}@example.co",
          admin_name:     "Admin",
          admin_password: "Password123!",
          vertical:       "generic"
        ).call.tenant
      end
    end

    it "desactiva y reactiva un tenant comercial" do
      patch "/api/v1/admin/tenants/#{managed_tenant.id}",
            params: { tenant: { active: false } }.to_json,
            headers: platform_headers
      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "active")).to be(false)

      patch "/api/v1/admin/tenants/#{managed_tenant.id}",
            params: { tenant: { active: true } }.to_json,
            headers: platform_headers
      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "active")).to be(true)
    end

    it "impide desactivar el tenant plataforma" do
      patch "/api/v1/admin/tenants/#{platform.id}",
            params: { tenant: { active: false } }.to_json,
            headers: platform_headers
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "CRM comercial bloqueado para super-admin" do
    it "rechaza oportunidades con sesión plataforma" do
      get "/api/v1/opportunities", headers: platform_headers
      expect(response).to have_http_status(:forbidden)
      expect(json["message"]).to include("plataforma")
    end
  end
end
