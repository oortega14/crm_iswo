# frozen_string_literal: true

require "rails_helper"

RSpec.describe ReminderUpcomingNotificationJob, type: :job do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:user)   { create(:user, :consultant, tenant: tenant) }
  let(:opp)    { create(:opportunity, tenant: tenant, owner_user: user) }

  it "procesa recordatorios en ventana de aviso previo" do
    reminder = create(:reminder, tenant: tenant, user: user, opportunity: opp,
                      remind_at: 15.minutes.from_now, status: "pending")

    expect(Reminders::UpcomingNotifier).to receive(:call).with(reminder: reminder).and_return(true)
    described_class.new.perform
  end
end
