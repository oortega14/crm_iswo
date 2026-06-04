# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::ReferralNetworks", type: :request do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:admin)      { create(:user, :admin,      tenant: tenant) }
  let(:manager)    { create(:user, :manager,    tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let(:referred)   { create(:user, :consultant, tenant: tenant) }
  let!(:edge)      { create(:referral_network, tenant: tenant, referrer_user: consultant, referred_user: referred, depth: 1) }

  describe "GET /api/v1/referral_networks" do
    it "200 con lista de relaciones" do
      get "/api/v1/referral_networks", headers: auth_headers(admin)
      expect(response).to have_http_status(:ok)
      ids = json["data"].map { |d| d["id"].to_i }
      expect(ids).to include(edge.id)
    end
  end

  describe "POST /api/v1/referral_networks" do
    let(:c2) { create(:user, :consultant, tenant: tenant) }
    let(:c3) { create(:user, :consultant, tenant: tenant) }

    it "admin crea un edge" do
      post "/api/v1/referral_networks",
           headers: auth_headers(admin),
           params: { referral_network: { referrer_user_id: c2.id, referred_user_id: c3.id, depth: 1 } }.to_json
      expect(response).to have_http_status(:created)
    end

    it "consultant no puede crear relaciones" do
      post "/api/v1/referral_networks",
           headers: auth_headers(consultant),
           params: { referral_network: { referrer_user_id: c2.id, referred_user_id: c3.id } }.to_json
      expect(response).to have_http_status(:forbidden)
    end

    it "422 por auto-referencia" do
      post "/api/v1/referral_networks",
           headers: auth_headers(admin),
           params: { referral_network: { referrer_user_id: c2.id, referred_user_id: c2.id } }.to_json
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "DELETE /api/v1/referral_networks/:id" do
    it "admin elimina edge" do
      delete "/api/v1/referral_networks/#{edge.id}", headers: auth_headers(admin)
      expect(response).to have_http_status(:no_content)
    end

    it "manager no puede eliminar" do
      delete "/api/v1/referral_networks/#{edge.id}", headers: auth_headers(manager)
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "GET /api/v1/referral_networks/tree" do
    it "devuelve árbol de referidos" do
      get "/api/v1/referral_networks/tree?root_user_id=#{consultant.id}", headers: auth_headers(admin)
      expect(response).to have_http_status(:ok)
      expect(json["data"]).to have_key("root")
      expect(json["data"]).to have_key("edges")
    end
  end

  describe "GET /api/v1/referral_networks/my_network" do
    it "devuelve la red propia del usuario autenticado" do
      get "/api/v1/referral_networks/my_network", headers: auth_headers(consultant)
      expect(response).to have_http_status(:ok)
      expect(json["data"]).to have_key("root")
    end
  end
end
