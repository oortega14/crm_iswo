# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Sessions", type: :request do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:password) { "secret12345" }
  let!(:user)  { create(:user, tenant: tenant, password: password) }

  describe "POST /api/v1/sessions (login)" do
    let(:payload) { { user: { email: user.email, password: password } }.to_json }

    it "autentica y devuelve el JWT en el header Authorization" do
      post "/api/v1/sessions", params: payload, headers: tenant_headers(tenant)

      expect(response).to have_http_status(:ok)
      expect(response.headers["Authorization"]).to match(/\ABearer /)
      expect(json.dig("data", "attributes", "email")).to eq(user.email)
      expect(json.dig("meta", "tenant", "slug")).to eq(tenant.slug)
    end

    it "emite una cookie encriptada de refresh" do
      post "/api/v1/sessions", params: payload, headers: tenant_headers(tenant)
      expect(response.cookies["refresh_token"]).to be_present
    end

    it "devuelve 401 si la contraseña es incorrecta" do
      bad = { user: { email: user.email, password: "wrong-pass" } }.to_json
      post "/api/v1/sessions", params: bad, headers: tenant_headers(tenant)
      expect(response).to have_http_status(:unauthorized)
    end

    it "devuelve 400 si no se resuelve el tenant", :without_tenant do
      standalone = create(:tenant)
      user = create(:user, tenant: standalone, password: password)
      post "/api/v1/sessions",
           params: { user: { email: user.email, password: password } }.to_json,
           headers: { "Content-Type" => "application/json" }
      expect(response).to have_http_status(:bad_request)
      expect(json["error"]).to eq("tenant_missing")
    end
  end

  describe "DELETE /api/v1/sessions (logout)" do
    it "revoca el token y limpia la cookie" do
      token = jwt_for(user)
      delete "/api/v1/sessions",
             headers: { "Authorization" => "Bearer #{token}", "X-Tenant-Slug" => tenant.slug }
      expect(response).to have_http_status(:no_content)
    end
  end

  describe "POST /api/v1/sessions/refresh" do
    it "falla si no hay cookie de refresh" do
      post "/api/v1/sessions/refresh", headers: tenant_headers(tenant)
      expect(response).to have_http_status(:unauthorized)
      expect(json["error"]).to eq("invalid_refresh_token")
    end
  end
end
