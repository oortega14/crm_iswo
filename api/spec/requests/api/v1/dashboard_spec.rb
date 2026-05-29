# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Dashboard", type: :request do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:manager) { create(:user, :manager, tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let!(:pipeline) { create(:pipeline, tenant: tenant, is_default: true) }
  let!(:stage) { create(:pipeline_stage, pipeline: pipeline, tenant: tenant, position: 1) }

  describe "GET /api/v1/dashboard/briefing" do
    it "responde 200 con resumen diario" do
      create(:opportunity, tenant: tenant, pipeline: pipeline, pipeline_stage: stage,
             owner_user: manager, temperature: "hot", bant_score: 80)

      get "/api/v1/dashboard/briefing", headers: auth_headers(manager)
      expect(response).to have_http_status(:ok)
      expect(json["data"]).to include(
        "generated_at",
        "kpis",
        "hot_leads",
        "overdue_reminders",
        "stale_leads"
      )
      expect(json["data"]["kpis"]).to include(
        "total_open",
        "hot_count",
        "overdue_count",
        "new_this_week"
      )
    end
  end

  describe "GET /api/v1/dashboard/kpis" do
    it "responde 200 con métricas esperadas" do
      get "/api/v1/dashboard/kpis", headers: auth_headers(manager)
      expect(response).to have_http_status(:ok)
      expect(json["data"]).to include(
        "total_in_pipeline",
        "pipeline_value",
        "month_closed_value",
        "bant_average",
        "win_rate",
        "won_count",
        "lost_count",
        "hot_count",
        "warm_count",
        "cold_count"
      )
    end

    it "filtra por pipeline_id cuando se envía" do
      other = create(:pipeline, tenant: tenant, is_default: false)
      other_stage = create(:pipeline_stage, pipeline: other, tenant: tenant, position: 1)
      create(:opportunity, tenant: tenant, pipeline: pipeline, pipeline_stage: stage, owner_user: manager)
      create(:opportunity, tenant: tenant, pipeline: other, pipeline_stage: other_stage, owner_user: manager)

      get "/api/v1/dashboard/kpis",
          params: { pipeline_id: pipeline.id },
          headers: auth_headers(manager)

      expect(response).to have_http_status(:ok)
      expect(json["data"]["total_in_pipeline"]).to eq(1)
    end
  end

  describe "GET /api/v1/dashboard/top_consultants" do
    it "responde 200 con data como arreglo" do
      get "/api/v1/dashboard/top_consultants", headers: auth_headers(manager)
      expect(response).to have_http_status(:ok)
      expect(json["data"]).to be_an(Array)
    end
  end

  describe "GET /api/v1/dashboard/pipeline" do
    it "responde 200 con etapas del pipeline por defecto" do
      get "/api/v1/dashboard/pipeline", headers: auth_headers(manager)
      expect(response).to have_http_status(:ok)
      expect(json["data"]).to be_an(Array)
      expect(json["data"].first).to include("stage", "count", "value", "conversion_rate") if json["data"].any?
    end

    it "responde 200 con pipeline_id explícito" do
      get "/api/v1/dashboard/pipeline",
          params: { pipeline_id: pipeline.id },
          headers: auth_headers(manager)
      expect(response).to have_http_status(:ok)
    end
  end

  describe "GET /api/v1/dashboard/activity" do
    it "responde 200 con arreglo de actividad" do
      get "/api/v1/dashboard/activity", headers: auth_headers(manager)
      expect(response).to have_http_status(:ok)
      expect(json["data"]).to be_an(Array)
    end
  end

  describe "GET /api/v1/dashboard/bant_distribution" do
    it "responde 200 con buckets BANT" do
      get "/api/v1/dashboard/bant_distribution", headers: auth_headers(manager)
      expect(response).to have_http_status(:ok)
      expect(json["data"]).to include("low", "medium", "high", "average")
    end
  end

  describe "GET /api/v1/dashboard/lead_sources_breakdown" do
    it "responde 200 sin duplicar Sin fuente" do
      create(:opportunity, tenant: tenant, pipeline: pipeline, pipeline_stage: stage,
             owner_user: manager, lead_source: nil)

      get "/api/v1/dashboard/lead_sources_breakdown", headers: auth_headers(manager)
      expect(response).to have_http_status(:ok)
      sin = json["data"].select { |r| r["name"] == "Sin fuente" }
      expect(sin.size).to be <= 1
    end
  end

  describe "alcance por rol (RFC §6.3)" do
    it "consultor solo ve KPIs de sus oportunidades" do
      create(:opportunity, tenant: tenant, pipeline: pipeline, pipeline_stage: stage, owner_user: manager)
      own = create(:opportunity, tenant: tenant, pipeline: pipeline, pipeline_stage: stage, owner_user: consultant)

      get "/api/v1/dashboard/kpis", headers: auth_headers(consultant)
      expect(response).to have_http_status(:ok)
      expect(json["data"]["total_in_pipeline"]).to eq(1)
      expect(own.owner_user_id).to eq(consultant.id)
    end
  end
end
