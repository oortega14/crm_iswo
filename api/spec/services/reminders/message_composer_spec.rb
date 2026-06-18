# frozen_string_literal: true

require "rails_helper"

RSpec.describe Reminders::MessageComposer do
  let(:tenant)      { ActsAsTenant.current_tenant }
  let(:user)        { create(:user, :consultant, tenant: tenant) }
  let(:contact)     { create(:contact, tenant: tenant, first_name: "Camila", last_name: "Restrepo") }
  let(:opportunity) { create(:opportunity, tenant: tenant, contact: contact, title: "Opp demo") }
  let(:reminder) do
    create(:reminder,
           tenant: tenant,
           user: user,
           opportunity: opportunity,
           channel: "whatsapp",
           subject: "prueba 1",
           message: "Llamar para cotización",
           remind_at: Time.zone.local(2026, 6, 4, 15, 45))
  end

  describe "#due_whatsapp" do
    it "estructura tarea, lead, vencimiento y notas" do
      body = described_class.for(reminder).due_whatsapp

      expect(body).to include("Recordatorio vencido")
      expect(body).to include("Tarea: prueba 1")
      expect(body).to include("Lead: Camila Restrepo")
      expect(body).to include("Vence:")
      expect(body).to include("Notas:")
      expect(body).to include("Llamar para cotización")
      expect(body).to include("Marca completado en el CRM")
    end

    it "omite notas si son iguales al asunto" do
      reminder.update!(message: "prueba 1")
      body = described_class.for(reminder).due_whatsapp

      expect(body).not_to include("Notas:")
    end
  end

  describe "#due_in_app" do
    it "menciona el canal extra cuando no es solo in_app" do
      body = described_class.for(reminder).due_in_app(channel: "whatsapp")
      expect(body).to include("Camila Restrepo")
      expect(body).to include("WhatsApp")
    end
  end
end
