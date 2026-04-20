# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Opportunities", type: :request do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:manager)    { create(:user, :manager, tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let(:other_consultant) { create(:user, :consultant, tenant: tenant) }

  let(:pipeline) { create(:pipeline_with_stages, tenant: tenant) }
  let(:stage)    { pipeline.pipeline_stages.first }
  let(:won_stage) { pipeline.pipeline_stages.find_by(closed_won: true) }
  let(:contact)  { create(:contact, tenant: tenant) }

  let!(:own_opp) do
    create(:opportunity,
           tenant: tenant, pipeline: pipeline, pipeline_stage: stage,
           contact: contact, owner_user: consultant, title: "Propia")
  end
  let!(:foreign_opp) do
    create(:opportunity,
           tenant: tenant, pipeline: pipeline, pipeline_stage: stage,
           contact: contact, owner_user: other_consultant, title: "Ajena")
  end

  describe "GET /api/v1/opportunities" do
    it "manager ve todas" do
      get "/api/v1/opportunities", headers: auth_headers(manager)
      expect(response).to have_http_status(:ok)
      ids = json["data"].map { |d| d["id"].to_i }
      expect(ids).to match_array([own_opp.id, foreign_opp.id])
    end

    it "consultant solo ve las suyas" do
      get "/api/v1/opportunities", headers: auth_headers(consultant)
      ids = json["data"].map { |d| d["id"].to_i }
      expect(ids).to eq([own_opp.id])
    end

    it "filtra por status" do
      own_opp.update!(status: "qualified")
      get "/api/v1/opportunities?status=qualified", headers: auth_headers(manager)
      ids = json["data"].map { |d| d["id"].to_i }
      expect(ids).to eq([own_opp.id])
    end

    it "filtra por pipeline_id" do
      other_pipeline = create(:pipeline_with_stages, tenant: tenant)
      other_opp = create(:opportunity,
                         tenant: tenant,
                         pipeline: other_pipeline,
                         pipeline_stage: other_pipeline.pipeline_stages.first,
                         owner_user: manager)

      get "/api/v1/opportunities?pipeline_id=#{other_pipeline.id}", headers: auth_headers(manager)
      ids = json["data"].map { |d| d["id"].to_i }
      expect(ids).to eq([other_opp.id])
    end
  end

  describe "POST /api/v1/opportunities" do
    let(:payload) do
      {
        opportunity: {
          contact_id: contact.id,
          pipeline_id: pipeline.id,
          pipeline_stage_id: stage.id,
          title: "Nueva deal",
          estimated_value: 1_000_000
        }
      }.to_json
    end

    it "201, asigna owner=current_user y crea log" do
      expect {
        post "/api/v1/opportunities", params: payload, headers: auth_headers(consultant)
      }.to change(Opportunity, :count).by(1)
        .and change(OpportunityLog, :count).by(1)

      expect(response).to have_http_status(:created)
      created = Opportunity.order(:created_at).last
      expect(created.owner_user_id).to eq(consultant.id)
      expect(created.opportunity_logs.last.action).to eq("create")
    end

    it "422 si falta título" do
      bad = { opportunity: { contact_id: contact.id, pipeline_id: pipeline.id, pipeline_stage_id: stage.id } }.to_json
      post "/api/v1/opportunities", params: bad, headers: auth_headers(consultant)
      expect(response.status).to eq(422)
      expect(json["error"]).to eq("unprocessable_entity")
    end
  end

  describe "PATCH /api/v1/opportunities/:id" do
    it "manager actualiza cualquier oportunidad" do
      patch "/api/v1/opportunities/#{foreign_opp.id}",
            params: { opportunity: { title: "Editada" } }.to_json,
            headers: auth_headers(manager)
      expect(response).to have_http_status(:ok)
      expect(foreign_opp.reload.title).to eq("Editada")
    end

    it "consultant no puede actualizar ajenas (403)" do
      patch "/api/v1/opportunities/#{foreign_opp.id}",
            params: { opportunity: { title: "Hack" } }.to_json,
            headers: auth_headers(consultant)
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "POST /api/v1/opportunities/:id/move_stage" do
    it "consultant puede mover su opp a won (marca status won)" do
      post "/api/v1/opportunities/#{own_opp.id}/move_stage",
           params: { pipeline_stage_id: won_stage.id }.to_json,
           headers: auth_headers(consultant)
      expect(response).to have_http_status(:ok)
      expect(own_opp.reload.status).to eq("won")
    end
  end

  describe "POST /api/v1/opportunities/:id/assign" do
    it "solo manager/admin; responde 200 y reasigna owner" do
      post "/api/v1/opportunities/#{foreign_opp.id}/assign",
           params: { owner_user_id: consultant.id }.to_json,
           headers: auth_headers(manager)
      expect(response).to have_http_status(:ok)
      expect(foreign_opp.reload.owner_user_id).to eq(consultant.id)
    end

    it "consultant es bloqueado (403)" do
      post "/api/v1/opportunities/#{own_opp.id}/assign",
           params: { owner_user_id: other_consultant.id }.to_json,
           headers: auth_headers(consultant)
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "GET /api/v1/opportunities/kanban" do
    it "devuelve array agrupado por stage con opportunities por etapa" do
      get "/api/v1/opportunities/kanban?pipeline_id=#{pipeline.id}", headers: auth_headers(manager)
      expect(response).to have_http_status(:ok)
      stages = json["data"].map { |d| d.dig("stage", "id").to_i }
      expect(stages).to match_array(pipeline.pipeline_stages.pluck(:id))
    end
  end

  describe "DELETE /api/v1/opportunities/:id" do
    it "admin soft-deleta (discard)" do
      admin = create(:user, :admin, tenant: tenant)
      delete "/api/v1/opportunities/#{own_opp.id}", headers: auth_headers(admin)
      expect(response).to have_http_status(:no_content)
      expect(own_opp.reload.discarded?).to be(true)
    end

    it "manager no puede destruir (403)" do
      delete "/api/v1/opportunities/#{own_opp.id}", headers: auth_headers(manager)
      expect(response).to have_http_status(:forbidden)
    end
  end
end
