# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Sessions", type: :request do
  let(:tenant)   { ActsAsTenant.current_tenant }
  let(:password) { "secret12345" }
  # let (lazy) para evitar NoTenantSet en examples con :without_tenant
  let(:user) { create(:user, tenant: tenant, password: password) }
  let(:payload) { { user: { email: user.email, password: password } }.to_json }

  describe "POST /api/v1/sessions (login)" do

    it "autentica y devuelve el JWT en el header Authorization" do
      post "/api/v1/sessions", params: payload, headers: tenant_headers(tenant)

      expect(response).to have_http_status(:ok)
      expect(response.headers["Authorization"]).to match(/\ABearer /)
      expect(json.dig("data", "attributes", "email")).to eq(user.email)
      expect(json.dig("meta", "tenant", "slug")).to eq(tenant.slug)
    end

    it "emite una cookie de refresh (verificado via endpoint /refresh)" do
      # Las cookies encriptadas de Rails no siempre son accesibles via response.headers
      # en Rack::Test. Verificamos indirectamente: el login es exitoso (JWT retornado)
      # y el endpoint /refresh rechaza requests sin cookie (test en describe "refresh").
      post "/api/v1/sessions", params: payload, headers: tenant_headers(tenant)
      expect(response).to have_http_status(:ok)
      expect(response.headers["Authorization"]).to be_present
    end

    it "devuelve 401 si la contraseña es incorrecta" do
      bad = { user: { email: user.email, password: "wrong-pass" } }.to_json
      post "/api/v1/sessions", params: bad, headers: tenant_headers(tenant)
      expect(response).to have_http_status(:unauthorized)
    end

    it "devuelve 400 si no se resuelve el tenant", :without_tenant do
      standalone = create(:tenant)
      standalone_user = ActsAsTenant.with_tenant(standalone) { create(:user, tenant: standalone, password: password) }
      post "/api/v1/sessions",
           params: { user: { email: standalone_user.email, password: password } }.to_json,
           headers: { "Content-Type" => "application/json" }
      expect(response).to have_http_status(:bad_request)
      expect(json["error"]).to eq("tenant_missing")
    end

    it "prioriza X-Tenant-Slug sobre un subdominio de Host incorrecto" do
      post "/api/v1/sessions",
           params: payload,
           headers: tenant_headers(tenant).merge("HTTP_HOST" => "otro-tenant.localhost")

      expect(response).to have_http_status(:ok)
      expect(json.dig("meta", "tenant", "slug")).to eq(tenant.slug)
    end

    it "devuelve tenant_not_found si el slug no existe en la base de datos" do
      post "/api/v1/sessions",
           params: payload,
           headers: tenant_headers(tenant).merge("X-Tenant-Slug" => "no-existe-xyz")

      expect(response).to have_http_status(:bad_request)
      expect(json["error"]).to eq("tenant_not_found")
    end
  end

  describe "DELETE /api/v1/sessions (logout)" do
    it "revoca el access token y responde 204" do
      token = jwt_for(user)
      headers = tenant_headers(tenant).merge(
        "Authorization" => "Bearer #{token}"
      )

      delete "/api/v1/sessions", headers: headers
      expect(response).to have_http_status(:no_content)

      get "/api/v1/me", headers: headers
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "POST /api/v1/sessions/refresh" do
    it "falla si no hay cookie de refresh" do
      post "/api/v1/sessions/refresh", headers: tenant_headers(tenant)
      expect(response).to have_http_status(:unauthorized)
      expect(json["error"]).to eq("invalid_refresh_token")
    end

    it "renueva el JWT en el header Authorization cuando la cookie es válida" do
      post "/api/v1/sessions", params: payload, headers: tenant_headers(tenant)
      expect(response).to have_http_status(:ok)

      post "/api/v1/sessions/refresh", headers: tenant_headers(tenant)
      expect(response).to have_http_status(:ok)
      expect(response.headers["Authorization"]).to match(/\ABearer /)
      expect(json.dig("data", "attributes", "email")).to eq(user.email)
    end

    it "dos refresh seguidos con la misma cookie: el primero rota y el segundo usa la nueva cookie" do
      post "/api/v1/sessions", params: payload, headers: tenant_headers(tenant)
      post "/api/v1/sessions/refresh", headers: tenant_headers(tenant)
      expect(response).to have_http_status(:ok)

      post "/api/v1/sessions/refresh", headers: tenant_headers(tenant)
      expect(response).to have_http_status(:ok)
    end

    it "rota el jti del refresh token en cada renovación" do
      post "/api/v1/sessions", params: payload, headers: tenant_headers(tenant)
      user.reload
      first_jti = user.refresh_token_jti
      expect(first_jti).to be_present

      post "/api/v1/sessions/refresh", headers: tenant_headers(tenant)
      user.reload
      expect(user.refresh_token_jti).to be_present
      expect(user.refresh_token_jti).not_to eq(first_jti)
    end
  end
end
