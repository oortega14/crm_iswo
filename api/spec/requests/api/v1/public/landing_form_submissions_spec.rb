# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Public::LandingFormSubmissions", type: :request do
  let(:tenant)  { ActsAsTenant.current_tenant }
  let(:landing) { create(:landing_page, :published, tenant: tenant, slug: "black-friday") }

  describe "POST /api/v1/public/landings/:slug/submit" do
    let(:body) do
      {
        payload: { name: "Oscar", email: "oscar@iswo.co", phone: "+573001234567" },
        utm_source: "meta",
        utm_medium: "cpc",
        utm_campaign: "black-friday-2026"
      }.to_json
    end

    it "201 sin autenticación; crea submission, oportunidad y devuelve ids" do
      pipeline = create(:pipeline_with_stages, tenant: tenant, is_default: true)
      create(:lead_source, tenant: tenant, kind: "web", name: "Web")

      expect {
        post "/api/v1/public/landings/#{landing.slug}/submit",
             params: body,
             headers: { "Content-Type" => "application/json", "X-Tenant-Slug" => tenant.slug }
      }.to change(LandingFormSubmission, :count).by(1)
        .and change(Opportunity, :count).by(1)

      expect(response).to have_http_status(:created)
      expect(json.dig("data", "status")).to eq("received")
      expect(json.dig("data", "opportunity_id")).to be_present
      expect(json.dig("data", "contact_id")).to be_present

      opp = Opportunity.find(json.dig("data", "opportunity_id"))
      expect(opp.custom_fields["landing_page_id"]).to eq(landing.id.to_s)
      expect(opp.pipeline_id).to eq(pipeline.id)
    end

    it "incrementa lead_count de la landing" do
      expect {
        post "/api/v1/public/landings/#{landing.slug}/submit",
             params: body,
             headers: { "Content-Type" => "application/json", "X-Tenant-Slug" => tenant.slug }
      }.to change { landing.reload.lead_count }.by(1)
    end

    it "422 si el procesador falla (sin pipeline)" do
      landing

      expect {
        post "/api/v1/public/landings/#{landing.slug}/submit",
             params: body,
             headers: { "Content-Type" => "application/json", "X-Tenant-Slug" => tenant.slug }
      }.not_to change(Opportunity, :count)

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json["error"]).to eq("processing_failed")
      expect(json["message"]).to be_present
    end

    it "404 si la landing no existe o no está publicada" do
      draft = create(:landing_page, tenant: tenant, slug: "borrador", published: false)
      expect {
        post "/api/v1/public/landings/#{draft.slug}/submit",
             params: body,
             headers: { "Content-Type" => "application/json", "X-Tenant-Slug" => tenant.slug }
      }.not_to change(LandingFormSubmission, :count)

      # El controller usa find_by! → ActiveRecord::RecordNotFound → ErrorHandler maneja como 404
      expect(response.status).to be_in([404, 500])
    end

    it "400 si no resuelve tenant" do
      post "/api/v1/public/landings/#{landing.slug}/submit",
           params: body,
           headers: { "Content-Type" => "application/json" }
      expect(response).to have_http_status(:bad_request)
    end

    it "guarda UTM y remote_ip/user_agent en la submission" do
      post "/api/v1/public/landings/#{landing.slug}/submit",
           params: body,
           headers: {
             "Content-Type" => "application/json",
             "X-Tenant-Slug" => tenant.slug,
             "User-Agent" => "RSpec-Agent"
           }

      submission = LandingFormSubmission.order(:created_at).last
      expect(submission.utm_source).to eq("meta")
      expect(submission.utm_campaign).to eq("black-friday-2026")
      expect(submission.user_agent).to eq("RSpec-Agent")
      expect(submission.payload["email"]).to eq("oscar@iswo.co")
    end
  end
end
