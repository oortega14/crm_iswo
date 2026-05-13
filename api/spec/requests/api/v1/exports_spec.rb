# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Exports", type: :request do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:manager) { create(:user, :manager, tenant: tenant) }

  describe "POST /api/v1/exports" do
    it "202 y normaliza export_format inválido a xlsx (evita ArgumentError del enum)" do
      expect(ExportGenerationJob).to receive(:perform_later)

      post "/api/v1/exports",
           params: { resource: "contacts", export_format: "json", filters: {} }.to_json,
           headers: auth_headers(manager)

      expect(response).to have_http_status(:accepted)
      expect(json.dig("data", "attributes", "format")).to eq("xlsx")
    end

    it "acepta filters como Hash JSON sin permit!" do
      expect(ExportGenerationJob).to receive(:perform_later)

      post "/api/v1/exports",
           params: {
             resource: "contacts",
             export_format: "csv",
             filters: { kind_eq: "person" }
           }.to_json,
           headers: auth_headers(manager)

      expect(response).to have_http_status(:accepted)
      expect(json.dig("data", "attributes", "format")).to eq("csv")
      expect(json.dig("data", "attributes", "filters")).to include("kind_eq" => "person")
    end
  end
end
