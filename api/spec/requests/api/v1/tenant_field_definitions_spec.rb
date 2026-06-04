# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::TenantFieldDefinitions", type: :request do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:admin)      { create(:user, :admin,      tenant: tenant) }
  let(:manager)    { create(:user, :manager,    tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }

  # ---------------------------------------------------------------------------
  describe "GET /api/v1/tenant_field_definitions" do
    let!(:opp_field)     { create(:tenant_field_definition,             tenant: tenant, entity: "opportunity", position: 0) }
    let!(:contact_field) { create(:tenant_field_definition, :for_contact, tenant: tenant,                       position: 1) }
    let!(:inactive)      { create(:tenant_field_definition, :inactive,    tenant: tenant, entity: "opportunity", position: 2) }

    it "200 devuelve solo activos por defecto" do
      get "/api/v1/tenant_field_definitions", headers: auth_headers(manager)

      expect(response).to have_http_status(:ok)
      ids = json["data"].map { |d| d["id"] }
      expect(ids).to include(opp_field.id.to_s, contact_field.id.to_s)
      expect(ids).not_to include(inactive.id.to_s)
    end

    it "filtra por ?entity=opportunity" do
      get "/api/v1/tenant_field_definitions?entity=opportunity", headers: auth_headers(manager)

      ids = json["data"].map { |d| d["id"] }
      expect(ids).to include(opp_field.id.to_s)
      expect(ids).not_to include(contact_field.id.to_s)
    end

    it "admin puede ver inactivos con include_inactive=true" do
      get "/api/v1/tenant_field_definitions?include_inactive=true", headers: auth_headers(admin)

      ids = json["data"].map { |d| d["id"] }
      expect(ids).to include(inactive.id.to_s)
    end

    it "401 sin autenticación" do
      get "/api/v1/tenant_field_definitions", headers: tenant_headers(tenant)
      expect(response).to have_http_status(:unauthorized)
    end
  end

  # ---------------------------------------------------------------------------
  describe "POST /api/v1/tenant_field_definitions" do
    let(:valid_params) do
      {
        tenant_field_definition: {
          key:        "empleador_nit",
          label:      "NIT del Empleador",
          field_type: "text",
          entity:     "opportunity",
          required:   false
        }
      }.to_json
    end

    it "201 admin crea el campo" do
      expect {
        post "/api/v1/tenant_field_definitions", params: valid_params, headers: auth_headers(admin)
      }.to change(TenantFieldDefinition, :count).by(1)

      expect(response).to have_http_status(:created)
      attrs = json.dig("data", "attributes")
      expect(attrs["key"]).to eq("empleador_nit")
      expect(attrs["label"]).to eq("NIT del Empleador")
    end

    it "crea campo select con opciones" do
      params = {
        tenant_field_definition: {
          key: "tipo_libranza", label: "Tipo", field_type: "select",
          entity: "opportunity", options: ["Pública", "Privada"]
        }
      }.to_json
      post "/api/v1/tenant_field_definitions", params: params, headers: auth_headers(admin)

      expect(response).to have_http_status(:created)
      expect(json.dig("data", "attributes", "options")).to eq(["Pública", "Privada"])
    end

    it "403 manager no puede crear" do
      post "/api/v1/tenant_field_definitions", params: valid_params, headers: auth_headers(manager)
      expect(response).to have_http_status(:forbidden)
    end

    it "403 consultant no puede crear" do
      post "/api/v1/tenant_field_definitions", params: valid_params, headers: auth_headers(consultant)
      expect(response).to have_http_status(:forbidden)
    end

    it "422 con key inválida (mayúsculas)" do
      params = {
        tenant_field_definition: { key: "NIT", label: "NIT", field_type: "text", entity: "opportunity" }
      }.to_json
      post "/api/v1/tenant_field_definitions", params: params, headers: auth_headers(admin)

      expect(response).to have_http_status(:unprocessable_content).or have_http_status(:unprocessable_entity)
    end

    it "422 con key duplicada en mismo tenant+entidad" do
      create(:tenant_field_definition, tenant: tenant, key: "duplicado", entity: "opportunity")
      params = {
        tenant_field_definition: { key: "duplicado", label: "X", field_type: "text", entity: "opportunity" }
      }.to_json
      post "/api/v1/tenant_field_definitions", params: params, headers: auth_headers(admin)

      expect(response).to have_http_status(:unprocessable_content).or have_http_status(:unprocessable_entity)
    end
  end

  # ---------------------------------------------------------------------------
  describe "PATCH /api/v1/tenant_field_definitions/:id" do
    let!(:field) { create(:tenant_field_definition, tenant: tenant, label: "Original") }

    it "200 admin actualiza el campo" do
      patch "/api/v1/tenant_field_definitions/#{field.id}",
            params: { tenant_field_definition: { label: "Actualizado" } }.to_json,
            headers: auth_headers(admin)

      expect(response).to have_http_status(:ok)
      expect(field.reload.label).to eq("Actualizado")
    end

    it "200 admin puede desactivar el campo" do
      patch "/api/v1/tenant_field_definitions/#{field.id}",
            params: { tenant_field_definition: { active: false } }.to_json,
            headers: auth_headers(admin)

      expect(response).to have_http_status(:ok)
      expect(field.reload.active).to be(false)
    end

    it "403 manager no puede actualizar" do
      patch "/api/v1/tenant_field_definitions/#{field.id}",
            params: { tenant_field_definition: { label: "X" } }.to_json,
            headers: auth_headers(manager)
      expect(response).to have_http_status(:forbidden)
    end
  end

  # ---------------------------------------------------------------------------
  describe "DELETE /api/v1/tenant_field_definitions/:id" do
    let!(:field) { create(:tenant_field_definition, tenant: tenant) }

    it "204 admin elimina el campo" do
      expect {
        delete "/api/v1/tenant_field_definitions/#{field.id}", headers: auth_headers(admin)
      }.to change(TenantFieldDefinition, :count).by(-1)

      expect(response).to have_http_status(:no_content)
    end

    it "403 manager no puede eliminar" do
      delete "/api/v1/tenant_field_definitions/#{field.id}", headers: auth_headers(manager)
      expect(response).to have_http_status(:forbidden)
    end
  end

  # ---------------------------------------------------------------------------
  describe "PATCH /api/v1/tenant_field_definitions/reorder" do
    let!(:f1) { create(:tenant_field_definition, tenant: tenant, position: 0) }
    let!(:f2) { create(:tenant_field_definition, tenant: tenant, position: 1) }
    let!(:f3) { create(:tenant_field_definition, tenant: tenant, position: 2) }

    it "204 admin reordena los campos" do
      patch "/api/v1/tenant_field_definitions/reorder",
            params: { ids: [f3.id, f1.id, f2.id] }.to_json,
            headers: auth_headers(admin)

      expect(response).to have_http_status(:no_content)
      expect(f3.reload.position).to eq(0)
      expect(f1.reload.position).to eq(1)
      expect(f2.reload.position).to eq(2)
    end

    it "403 manager no puede reordenar" do
      patch "/api/v1/tenant_field_definitions/reorder",
            params: { ids: [f1.id] }.to_json,
            headers: auth_headers(manager)
      expect(response).to have_http_status(:forbidden)
    end
  end
end
