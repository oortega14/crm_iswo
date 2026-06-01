# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Users", type: :request do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:admin)      { create(:user, :admin,      tenant: tenant) }
  let(:manager)    { create(:user, :manager,    tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }

  describe "GET /api/v1/users" do
    it "admin ve todos los usuarios" do
      consultant
      get "/api/v1/users", headers: auth_headers(admin)
      expect(response).to have_http_status(:ok)
      ids = json["data"].map { |d| d["id"].to_i }
      expect(ids).to include(consultant.id, admin.id)
    end

    it "consultant no puede listar usuarios" do
      get "/api/v1/users", headers: auth_headers(consultant)
      expect(response).to have_http_status(:forbidden)
    end

    it "filtra por rol" do
      manager  # forzar creación antes del request
      consultant
      get "/api/v1/users?role=manager", headers: auth_headers(admin)
      expect(response).to have_http_status(:ok)
      ids = json["data"].map { |d| d["id"].to_i }
      expect(ids).to include(manager.id)
      expect(ids).not_to include(consultant.id)
    end
  end

  describe "GET /api/v1/users/:id" do
    it "admin puede ver cualquier usuario" do
      get "/api/v1/users/#{consultant.id}", headers: auth_headers(admin)
      expect(response).to have_http_status(:ok)
    end

    it "consultant puede verse a sí mismo" do
      get "/api/v1/users/#{consultant.id}", headers: auth_headers(consultant)
      expect(response).to have_http_status(:ok)
    end

    it "consultant no puede ver a otro usuario" do
      get "/api/v1/users/#{admin.id}", headers: auth_headers(consultant)
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "POST /api/v1/users" do
    it "admin invita un nuevo usuario" do
      post "/api/v1/users",
           headers: auth_headers(admin),
           params: { user: { name: "Nuevo Consultor", email: "nuevo@iswo.co", role: "consultant" } }.to_json
      expect(response).to have_http_status(:created)
      expect(json.dig("data", "attributes", "email")).to eq("nuevo@iswo.co")
    end

    it "manager no puede crear usuarios" do
      post "/api/v1/users",
           headers: auth_headers(manager),
           params: { user: { name: "X", email: "x@iswo.co" } }.to_json
      expect(response).to have_http_status(:forbidden)
    end

    it "422 con email duplicado" do
      post "/api/v1/users",
           headers: auth_headers(admin),
           params: { user: { name: "Dup", email: consultant.email } }.to_json
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PATCH /api/v1/users/:id" do
    it "admin actualiza nombre de un usuario" do
      patch "/api/v1/users/#{consultant.id}",
            headers: auth_headers(admin),
            params: { user: { name: "Nombre Nuevo" } }.to_json
      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "attributes", "name")).to eq("Nombre Nuevo")
    end

    it "consultant puede actualizarse a sí mismo" do
      patch "/api/v1/users/#{consultant.id}",
            headers: auth_headers(consultant),
            params: { user: { name: "Self Updated" } }.to_json
      expect(response).to have_http_status(:ok)
    end
  end

  describe "DELETE /api/v1/users/:id" do
    it "admin puede soft-delete de otro usuario" do
      delete "/api/v1/users/#{consultant.id}", headers: auth_headers(admin)
      expect(response).to have_http_status(:no_content)
      expect(consultant.reload.discarded_at).not_to be_nil
    end

    it "admin no puede eliminarse a sí mismo" do
      delete "/api/v1/users/#{admin.id}", headers: auth_headers(admin)
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "POST /api/v1/users/:id/deactivate + activate" do
    it "admin puede desactivar y reactivar un usuario" do
      post "/api/v1/users/#{consultant.id}/deactivate", headers: auth_headers(admin)
      expect(response).to have_http_status(:no_content)
      expect(consultant.reload.active).to be(false)

      post "/api/v1/users/#{consultant.id}/activate", headers: auth_headers(admin)
      expect(response).to have_http_status(:no_content)
      expect(consultant.reload.active).to be(true)
    end
  end
end
