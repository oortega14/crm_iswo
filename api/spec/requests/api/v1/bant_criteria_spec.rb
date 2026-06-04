# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::BantCriteria", type: :request do
  let(:tenant)  { ActsAsTenant.current_tenant }
  let(:admin)   { create(:user, :admin,   tenant: tenant) }
  let(:manager) { create(:user, :manager, tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }

  describe "GET /api/v1/bant_criterion" do
    it "devuelve el criterio del tenant (crea uno si no existe)" do
      get "/api/v1/bant_criterion", headers: auth_headers(admin)
      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "type")).to eq("bant_criterion")
    end

    it "cualquier staff puede ver el criterio" do
      get "/api/v1/bant_criterion", headers: auth_headers(consultant)
      expect(response).to have_http_status(:ok)
    end
  end

  describe "PATCH /api/v1/bant_criterion" do
    it "admin puede actualizar pesos" do
      patch "/api/v1/bant_criterion",
            headers: auth_headers(admin),
            params: { bant_criterion: { budget_weight: 30, authority_weight: 30,
                                        need_weight: 20, timeline_weight: 20,
                                        threshold_qualified: 70 } }.to_json
      expect(response).to have_http_status(:ok)
      data = json.dig("data", "attributes")
      expect(data["budget_weight"]).to eq(30)
      expect(data["threshold_qualified"]).to eq(70)
    end

    it "manager no puede actualizar (solo admin)" do
      patch "/api/v1/bant_criterion",
            headers: auth_headers(manager),
            params: { bant_criterion: { budget_weight: 50 } }.to_json
      expect(response).to have_http_status(:forbidden)
    end
  end
end
