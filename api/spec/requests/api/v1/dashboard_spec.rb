# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Dashboard", type: :request do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:manager) { create(:user, :manager, tenant: tenant) }

  describe "GET /api/v1/dashboard/top_consultants" do
    it "responde 200 con data como arreglo" do
      get "/api/v1/dashboard/top_consultants", headers: auth_headers(manager)
      expect(response).to have_http_status(:ok)
      expect(json["data"]).to be_an(Array)
    end
  end

  describe "GET /api/v1/dashboard/pipeline" do
    it "responde 200 incluso si no hay pipeline (data vacío)" do
      get "/api/v1/dashboard/pipeline", headers: auth_headers(manager)
      expect(response).to have_http_status(:ok)
      expect(json["data"]).to eq([])
    end
  end
end
