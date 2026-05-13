# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Searches", type: :request do
  let(:tenant)  { ActsAsTenant.current_tenant }
  let(:manager) { create(:user, :manager, tenant: tenant) }

  describe "GET /api/v1/search" do
    it "401 sin JWT" do
      get "/api/v1/search", params: { q: "ab" }, headers: tenant_headers(tenant)
      expect(response).to have_http_status(:unauthorized)
    end

    it "data vacío si q tiene menos de 2 caracteres" do
      get "/api/v1/search", params: { q: "a" }, headers: auth_headers(manager)
      expect(response).to have_http_status(:ok)
      expect(json["data"]).to eq([])
    end

    it "devuelve contactos y oportunidades que coinciden" do
      contact = create(:contact, tenant: tenant, first_name: "SearchUniqueName", last_name: "Z")
      opp = create(:opportunity, tenant: tenant, title: "SearchUniqueOppTitle", contact: contact)

      get "/api/v1/search", params: { q: "SearchUnique" }, headers: auth_headers(manager)
      expect(response).to have_http_status(:ok)
      types = json["data"].map { |d| d["type"] }
      expect(types).to include("contact", "opportunity")
      ids = json["data"].map { |d| d["id"] }
      expect(ids).to include(contact.id.to_s, opp.id.to_s)
    end
  end
end
