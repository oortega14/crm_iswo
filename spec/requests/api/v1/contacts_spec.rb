# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Contacts", type: :request do
  let(:tenant)  { ActsAsTenant.current_tenant }
  let(:manager) { create(:user, :manager, tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }

  describe "autenticación y tenant" do
    it "401 si no hay JWT" do
      get "/api/v1/contacts", headers: tenant_headers(tenant)
      expect(response).to have_http_status(:unauthorized)
    end

    it "400 si no resuelve tenant" do
      get "/api/v1/contacts", headers: { "Authorization" => "Bearer #{jwt_for(manager)}" }
      expect(response).to have_http_status(:bad_request)
      expect(json["error"]).to eq("tenant_missing")
    end

    it "403 si el JWT corresponde a otro tenant", :without_tenant do
      home_tenant = create(:tenant, slug: "home")
      other_tenant = create(:tenant, slug: "other")
      user = ActsAsTenant.with_tenant(home_tenant) { create(:user, :manager, tenant: home_tenant) }

      get "/api/v1/contacts",
          headers: {
            "Authorization" => "Bearer #{jwt_for(user)}",
            "X-Tenant-Slug" => other_tenant.slug
          }
      expect(response).to have_http_status(:forbidden)
      expect(json["error"]).to eq("tenant_mismatch")
    end
  end

  describe "GET /api/v1/contacts" do
    let!(:contact_a) { create(:contact, tenant: tenant, first_name: "Ana") }
    let!(:contact_b) { create(:contact, tenant: tenant, first_name: "Beto") }

    it "200 con lista paginada JSON:API" do
      get "/api/v1/contacts", headers: auth_headers(manager)

      expect(response).to have_http_status(:ok)
      ids = json["data"].map { |d| d["id"].to_i }
      expect(ids).to match_array([contact_a.id, contact_b.id])
      expect(json.dig("meta", "pagination")).to include("page", "pages", "count")
    end

    it "filtra por ?q=" do
      get "/api/v1/contacts?q=Ana", headers: auth_headers(manager)
      expect(response).to have_http_status(:ok)
      ids = json["data"].map { |d| d["id"].to_i }
      expect(ids).to eq([contact_a.id])
    end

    it "filtra por kind=company" do
      company = create(:contact, :company, tenant: tenant)
      get "/api/v1/contacts?kind=company", headers: auth_headers(manager)
      ids = json["data"].map { |d| d["id"].to_i }
      expect(ids).to include(company.id)
      expect(ids).not_to include(contact_a.id, contact_b.id)
    end

    it "consultant solo ve sus contactos via policy_scope" do
      own = create(:contact, tenant: tenant, owner_user: consultant)
      get "/api/v1/contacts", headers: auth_headers(consultant)
      ids = json["data"].map { |d| d["id"].to_i }
      expect(ids).to include(own.id)
      expect(ids).not_to include(contact_a.id, contact_b.id)
    end
  end

  describe "POST /api/v1/contacts" do
    it "201 y crea con owner=current_user" do
      payload = { contact: { kind: "person", first_name: "Nuevo", last_name: "Prospect", email: "np@iswo.co" } }.to_json

      expect {
        post "/api/v1/contacts", params: payload, headers: auth_headers(consultant)
      }.to change(Contact, :count).by(1)

      expect(response).to have_http_status(:created)
      created = Contact.last
      expect(created.owner_user_id).to eq(consultant.id)
      expect(json.dig("data", "attributes", "first_name")).to eq("Nuevo")
    end

    it "422 con detalles de validación si falta nombre y company" do
      payload = { contact: { kind: "person" } }.to_json
      post "/api/v1/contacts", params: payload, headers: auth_headers(manager)

      expect(response).to have_http_status(:unprocessable_content).or have_http_status(:unprocessable_entity)
      expect(json["error"]).to eq("unprocessable_entity")
      expect(json["details"]).to be_present
    end
  end

  describe "PATCH /api/v1/contacts/:id" do
    let(:other_consultant) { create(:user, :consultant, tenant: tenant) }
    let!(:contact) { create(:contact, tenant: tenant, owner_user: other_consultant) }

    it "manager puede actualizar cualquier contacto" do
      patch "/api/v1/contacts/#{contact.id}",
            params: { contact: { first_name: "Editado" } }.to_json,
            headers: auth_headers(manager)
      expect(response).to have_http_status(:ok)
      expect(contact.reload.first_name).to eq("Editado")
    end

    it "consultant ajeno es bloqueado por Pundit (403)" do
      patch "/api/v1/contacts/#{contact.id}",
            params: { contact: { first_name: "Hackeado" } }.to_json,
            headers: auth_headers(consultant)
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "DELETE /api/v1/contacts/:id" do
    let!(:contact) { create(:contact, tenant: tenant) }

    it "admin hace soft-delete (discard) y responde 204" do
      admin = create(:user, :admin, tenant: tenant)
      delete "/api/v1/contacts/#{contact.id}", headers: auth_headers(admin)
      expect(response).to have_http_status(:no_content)
      expect(contact.reload.discarded?).to be(true)
    end

    it "manager no puede destruir (403)" do
      delete "/api/v1/contacts/#{contact.id}", headers: auth_headers(manager)
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "POST /api/v1/contacts/export" do
    it "manager encola ExportGenerationJob y devuelve 202" do
      expect(ExportGenerationJob).to receive(:perform_later)

      post "/api/v1/contacts/export",
           params: { format: "csv" }.to_json,
           headers: auth_headers(manager)

      expect(response).to have_http_status(:accepted)
      expect(json.dig("data", "attributes", "format")).to eq("csv")
    end

    it "consultant no puede exportar (403)" do
      post "/api/v1/contacts/export",
           params: { format: "csv" }.to_json,
           headers: auth_headers(consultant)
      expect(response).to have_http_status(:forbidden)
    end
  end
end
