# frozen_string_literal: true

require "rails_helper"

RSpec.describe Reminders::UpcomingNotifier do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:user)   { create(:user, :consultant, tenant: tenant, email: "up@iswo.co") }
  let(:opp)    { create(:opportunity, tenant: tenant, owner_user: user) }
  let(:reminder) do
    create(:reminder, tenant: tenant, user: user, opportunity: opp,
           channel: "email", remind_at: 20.minutes.from_now, subject: "Seguimiento")
  end

  it "envía correo previo, notifica in-app y marca upcoming_notified_at" do
    mail = instance_double(ActionMailer::MessageDelivery, deliver_now: true)
    allow(ReminderMailer).to receive(:with).with(reminder: reminder).and_return(
      double(upcoming_due_notification: mail)
    )

    expect {
      described_class.call(reminder: reminder)
    }.to change { user.notifications.kind_reminder_upcoming.count }.by(1)

    expect(reminder.reload.upcoming_notified_at).to be_present
    expect(mail).to have_received(:deliver_now)
  end

  it "no notifica si ya está completado" do
    reminder.update!(status: "done")
    expect(described_class.call(reminder: reminder)).to be(false)
  end
end
