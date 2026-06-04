# frozen_string_literal: true

require "rails_helper"

# ============================================================================
# Auditable concern — probado a través de LeadSourcesController,
# que no tiene auditoría manual propia y pasa íntegramente por el concern.
# ============================================================================
RSpec.describe "Auditable concern", type: :request do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:admin)  { create(:user, :admin,   tenant: tenant) }
  let(:manager){ create(:user, :manager, tenant: tenant) }

  # ---------------------------------------------------------------------------
  describe "create" do
    let(:valid_params) do
      { lead_source: { name: "Feria comercial", kind: "manual" } }.to_json
    end

    it "registra AuditEvent con action=create tras POST exitoso" do
      expect {
        post "/api/v1/lead_sources", params: valid_params, headers: auth_headers(admin)
      }.to change(AuditEvent, :count).by(1)

      expect(response).to have_http_status(:created)
      event = AuditEvent.last
      expect(event.action).to      eq("create")
      expect(event.entity_type).to eq("LeadSource")
      expect(event.user_id).to     eq(admin.id)
      expect(event.tenant_id).to   eq(tenant.id)
      expect(event.entity_id).to   be_present
      expect(event.metadata["name"]).to eq("Feria comercial")
    end

    it "NO registra AuditEvent si la validación falla (respuesta 422)" do
      invalid = { lead_source: { name: "", kind: "manual" } }.to_json

      expect {
        post "/api/v1/lead_sources", params: invalid, headers: auth_headers(admin)
      }.not_to change(AuditEvent, :count)
    end
  end

  # ---------------------------------------------------------------------------
  describe "update" do
    let!(:lead_source) { create(:lead_source, tenant: tenant, name: "Antes") }

    it "registra AuditEvent con action=update y diff de cambios" do
      expect {
        patch "/api/v1/lead_sources/#{lead_source.id}",
              params: { lead_source: { name: "Después" } }.to_json,
              headers: auth_headers(admin)
      }.to change(AuditEvent, :count).by(1)

      event = AuditEvent.last
      expect(event.action).to      eq("update")
      expect(event.entity_type).to eq("LeadSource")
      expect(event.entity_id).to   eq(lead_source.id)
      expect(event.metadata.dig("changes", "name")).to eq(["Antes", "Después"])
    end

    it "NO registra AuditEvent si Pundit bloquea (respuesta 403)" do
      viewer = create(:user, :viewer, tenant: tenant)

      expect {
        patch "/api/v1/lead_sources/#{lead_source.id}",
              params: { lead_source: { name: "Hack" } }.to_json,
              headers: auth_headers(viewer)
      }.not_to change(AuditEvent, :count)

      expect(response).to have_http_status(:forbidden)
    end
  end

  # ---------------------------------------------------------------------------
  describe "destroy" do
    let!(:lead_source) { create(:lead_source, tenant: tenant) }

    it "registra AuditEvent con action=destroy" do
      expect {
        delete "/api/v1/lead_sources/#{lead_source.id}", headers: auth_headers(admin)
      }.to change(AuditEvent, :count).by(1)

      event = AuditEvent.last
      expect(event.action).to      eq("destroy")
      expect(event.entity_type).to eq("LeadSource")
      expect(event.entity_id).to   eq(lead_source.id)
    end
  end

  # ---------------------------------------------------------------------------
  describe "controladores excluidos" do
    it "NO registra AuditEvent para oportunidades (usan opportunity_logs)" do
      pipeline = create(:pipeline_with_stages, tenant: tenant)
      contact  = create(:contact, tenant: tenant)
      opp = create(:opportunity, tenant: tenant, pipeline: pipeline,
                   pipeline_stage: pipeline.pipeline_stages.first,
                   contact: contact, owner_user: admin)

      expect {
        patch "/api/v1/opportunities/#{opp.id}",
              params: { opportunity: { notes: "test" } }.to_json,
              headers: auth_headers(admin)
      }.not_to change(AuditEvent, :count)
    end

    it "NO registra AuditEvent para contacts (tienen audit_contact! propio)" do
      contact = create(:contact, tenant: tenant)
      initial = AuditEvent.count

      patch "/api/v1/contacts/#{contact.id}",
            params: { contact: { first_name: "X" } }.to_json,
            headers: auth_headers(admin)

      # Solo el audit_contact! del controller, NO el concern (sería 2)
      expect(AuditEvent.count - initial).to eq(1)
      expect(AuditEvent.last.action).to eq("contact.update")
    end
  end

  # ---------------------------------------------------------------------------
  describe "enmascaramiento de datos sensibles" do
    let!(:user_target) { create(:user, :consultant, tenant: tenant, phone: "+573001234567") }

    it "redacta el campo phone en el diff de update de usuarios" do
      patch "/api/v1/users/#{user_target.id}",
            params: { user: { phone: "+573009999999" } }.to_json,
            headers: auth_headers(admin)

      expect(response).to have_http_status(:ok)
      event = AuditEvent.where(entity_type: "User", action: "update").last
      expect(event).to be_present
      expect(event.metadata.dig("changes", "phone")).to eq("[REDACTED]")
    end
  end

  describe "ivar no convencional (reminders)" do
    let(:opportunity) { create(:opportunity, tenant: tenant, owner_user: admin) }

    it "registra AuditEvent tras POST create cuando @reminder está asignado" do
      payload = {
        reminder: {
          remind_at: 2.days.from_now.iso8601,
          channel:   "in_app",
          subject:   "Auditable",
          message:   "Test"
        }
      }.to_json

      expect {
        post "/api/v1/opportunities/#{opportunity.id}/reminders",
             params:  payload,
             headers: auth_headers(admin)
      }.to change(AuditEvent, :count).by(1)

      event = AuditEvent.last
      expect(event.action).to      eq("create")
      expect(event.entity_type).to eq("Reminder")
    end
  end
end
