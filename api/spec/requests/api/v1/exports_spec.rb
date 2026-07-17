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

  describe "GET /api/v1/exports" do
    let!(:failed_export) do
      create(:export, tenant: tenant, user: manager, resource: "contacts", format: "csv",
             status: "failed", error_message: "LOCKBOX test")
    end

    it "lista exportaciones fallidas (no expiradas)" do
      get "/api/v1/exports", headers: auth_headers(manager)
      expect(response).to have_http_status(:ok)
      ids = json["data"].map { |d| d["id"].to_i }
      expect(ids).to include(failed_export.id)
    end

    it "consultant no puede listar exportaciones (403)" do
      consultant = create(:user, :consultant, tenant: tenant)
      get "/api/v1/exports", headers: auth_headers(consultant)
      expect(response).to have_http_status(:forbidden)
    end
  end
end
