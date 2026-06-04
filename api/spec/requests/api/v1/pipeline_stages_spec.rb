# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::PipelineStages", type: :request do
  let(:tenant)    { ActsAsTenant.current_tenant }
  let(:admin)     { create(:user, :admin,      tenant: tenant) }
  let(:manager)   { create(:user, :manager,    tenant: tenant) }
  let(:consultant){ create(:user, :consultant, tenant: tenant) }
  let!(:pipeline) { create(:pipeline, tenant: tenant, name: "Principal") }
  let!(:stage)    { create(:pipeline_stage, pipeline: pipeline, tenant: tenant, name: "Nueva", position: 0) }

  describe "GET /api/v1/pipelines/:pipeline_id/stages" do
    it "200 con etapas del pipeline" do
      get "/api/v1/pipelines/#{pipeline.id}/stages", headers: auth_headers(consultant)
      expect(response).to have_http_status(:ok)
      ids = json["data"].map { |d| d["id"].to_i }
      expect(ids).to include(stage.id)
    end
  end

  describe "POST /api/v1/pipelines/:pipeline_id/stages" do
    it "admin crea etapa" do
      post "/api/v1/pipelines/#{pipeline.id}/stages",
           headers: auth_headers(admin),
           params: { pipeline_stage: { name: "Calificada", position: 1, probability: 50 } }.to_json
      expect(response).to have_http_status(:created)
      expect(json.dig("data", "attributes", "name")).to eq("Calificada")
    end

    it "consultant no puede crear etapas" do
      post "/api/v1/pipelines/#{pipeline.id}/stages",
           headers: auth_headers(consultant),
           params: { pipeline_stage: { name: "X", position: 2 } }.to_json
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "PATCH /api/v1/pipelines/:pipeline_id/stages/:id" do
    it "manager actualiza etapa" do
      patch "/api/v1/pipelines/#{pipeline.id}/stages/#{stage.id}",
            headers: auth_headers(manager),
            params: { pipeline_stage: { name: "Etapa renombrada" } }.to_json
      expect(response).to have_http_status(:ok)
      expect(json.dig("data", "attributes", "name")).to eq("Etapa renombrada")
    end
  end

  describe "PATCH /api/v1/pipelines/:pipeline_id/stages/reorder" do
    it "admin puede reordenar etapas" do
      s2 = create(:pipeline_stage, pipeline: pipeline, tenant: tenant, name: "Segunda", position: 1)
      patch "/api/v1/pipelines/#{pipeline.id}/stages/reorder",
            headers: auth_headers(admin),
            params: { order: [s2.id, stage.id] }.to_json
      expect(response).to have_http_status(:ok)
      expect(s2.reload.position).to eq(0)
      expect(stage.reload.position).to eq(1)
    end
  end

  describe "DELETE /api/v1/pipelines/:pipeline_id/stages/:id" do
    it "admin elimina etapa" do
      delete "/api/v1/pipelines/#{pipeline.id}/stages/#{stage.id}", headers: auth_headers(admin)
      expect(response).to have_http_status(:no_content)
    end

    it "manager puede eliminar etapas (el controller delega al permiso :update? del pipeline)" do
      s2 = create(:pipeline_stage, pipeline: pipeline, tenant: tenant, name: "Extra", position: 5)
      delete "/api/v1/pipelines/#{pipeline.id}/stages/#{s2.id}", headers: auth_headers(manager)
      expect(response).to have_http_status(:no_content)
    end
  end
end
