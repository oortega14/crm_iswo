# frozen_string_literal: true

require "rails_helper"

RSpec.describe Notifications::ReminderDueNotifier do
  let(:tenant)      { ActsAsTenant.current_tenant }
  let(:user)        { create(:user, :consultant, tenant: tenant) }
  let(:pipeline)    { create(:pipeline_with_stages, tenant: tenant) }
  let(:opportunity) do
    create(:opportunity,
           tenant: tenant,
           pipeline: pipeline,
           pipeline_stage: pipeline.pipeline_stages.first,
           owner_user: user,
           title: "Opp test")
  end
  let(:reminder) do
    create(:reminder,
           tenant: tenant,
           user: user,
           opportunity: opportunity,
           channel: "email",
           subject: "Llamar cliente",
           message: "Confirmar propuesta",
           remind_at: 1.minute.ago,
           status: "pending")
  end

  it "crea notificación reminder_due para el usuario del recordatorio" do
    expect do
      expect(described_class.call(reminder: reminder)).to be(true)
    end.to change { user.notifications.kind_reminder_due.count }.by(1)

    n = user.notifications.kind_reminder_due.last
    expect(n.title).to eq("Llamar cliente")
    expect(n.body).to include("Recordatorio vencido")
    expect(n.body).to include("Confirmar propuesta")
    expect(n.body).to include("correo")
    expect(n.resource).to eq(opportunity)
  end

  it "no menciona canal extra cuando el recordatorio es solo in_app" do
    reminder.update!(channel: "in_app")

    described_class.call(reminder: reminder)

    expect(user.notifications.kind_reminder_due.last.body).not_to include("también enviado")
  end

  it "devuelve false si no hay oportunidad" do
    allow(reminder).to receive(:opportunity).and_return(nil)

    expect(described_class.call(reminder: reminder)).to be(false)
  end
end
