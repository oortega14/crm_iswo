# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::AiCapabilities", type: :request do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:manager) { create(:user, :manager, tenant: tenant) }

  describe "GET /api/v1/ai/capabilities" do
    it "responde 200 con estado de Claude temperatura" do
      get "/api/v1/ai/capabilities", headers: auth_headers(manager)
      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "claude_temperature")).to include(
        "available",
        "model",
        "auto_on_save",
        "auto_on_bant_recalc"
      )
    end
  end
end
