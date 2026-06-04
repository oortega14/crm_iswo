# frozen_string_literal: true

require "rails_helper"

RSpec.describe Reminders::CreatedNotifier do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:user)   { create(:user, :consultant, tenant: tenant, email: "rem@iswo.co") }
  let(:opp)    { create(:opportunity, tenant: tenant, owner_user: user) }
  let(:reminder) do
    create(:reminder, tenant: tenant, user: user, opportunity: opp,
           channel: "in_app", remind_at: 2.days.from_now, subject: "Llamar mañana")
  end

  it "envía correo de confirmación y crea notificación in-app" do
    mail = instance_double(ActionMailer::MessageDelivery, deliver_now: true)
    allow(ReminderMailer).to receive(:with).with(reminder: reminder).and_return(
      double(created_confirmation: mail)
    )

    expect {
      described_class.call(reminder: reminder)
    }.to change { user.notifications.kind_reminder_created.count }.by(1)

    expect(mail).to have_received(:deliver_now)
  end
end
