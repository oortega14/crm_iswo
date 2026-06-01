# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::DuplicateFlags", type: :request do
  let(:tenant)    { ActsAsTenant.current_tenant }
  let(:admin)     { create(:user, :admin,   tenant: tenant) }
  let(:manager)   { create(:user, :manager, tenant: tenant) }
  let(:consultant){ create(:user, :consultant, tenant: tenant) }
  let(:pipeline)  { create(:pipeline_with_stages, tenant: tenant) }
  let(:contact)   { create(:contact, tenant: tenant) }
  let(:opp_a)     { create(:opportunity, tenant: tenant, contact: contact, pipeline: pipeline, pipeline_stage: pipeline.pipeline_stages.first) }
  let(:opp_b)     { create(:opportunity, tenant: tenant, contact: contact, pipeline: pipeline, pipeline_stage: pipeline.pipeline_stages.first) }
  let!(:flag)     { create(:duplicate_flag, tenant: tenant, opportunity: opp_a, duplicate_of_opportunity: opp_b) }

  describe "GET /api/v1/duplicate_flags" do
    it "200 con lista de flags" do
      get "/api/v1/duplicate_flags", headers: auth_headers(admin)
      expect(response).to have_http_status(:ok)
      ids = json["data"].map { |d| d["id"].to_i }
      expect(ids).to include(flag.id)
    end

    it "filtra por resolution=pending" do
      get "/api/v1/duplicate_flags?resolution=pending", headers: auth_headers(admin)
      expect(response).to have_http_status(:ok)
      ids = json["data"].map { |d| d["id"].to_i }
      expect(ids).to include(flag.id)
    end
  end

  describe "GET /api/v1/duplicate_flags/:id" do
    it "200 con detalle" do
      get "/api/v1/duplicate_flags/#{flag.id}", headers: auth_headers(admin)
      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "id").to_i).to eq(flag.id)
    end

    it "consultant puede ver un flag (show? = staff?)" do
      get "/api/v1/duplicate_flags/#{flag.id}", headers: auth_headers(consultant)
      expect(response).to have_http_status(:ok)
    end
  end

  describe "POST /api/v1/duplicate_flags/:id/ignore" do
    it "manager puede ignorar un flag" do
      post "/api/v1/duplicate_flags/#{flag.id}/ignore", headers: auth_headers(manager)
      expect(response).to have_http_status(:no_content)
      expect(flag.reload.resolution).to eq("ignored")
    end
  end

  describe "POST /api/v1/duplicate_flags/scan" do
    it "admin puede lanzar el scan" do
      post "/api/v1/duplicate_flags/scan", headers: auth_headers(admin)
      expect(response).to have_http_status(:ok)
      expect(json).to include("scanned", "created")
    end

    it "consultant no puede lanzar el scan" do
      post "/api/v1/duplicate_flags/scan", headers: auth_headers(consultant)
      expect(response).to have_http_status(:forbidden)
    end
  end
end
