# frozen_string_literal: true

require "rails_helper"

RSpec.describe Reminder, type: :model do
  let(:tenant)  { ActsAsTenant.current_tenant }
  let(:pipeline) { create(:pipeline_with_stages, tenant: tenant) }
  let(:contact) { create(:contact, tenant: tenant) }
  let(:opp)     { create(:opportunity, tenant: tenant, contact: contact, pipeline: pipeline, pipeline_stage: pipeline.pipeline_stages.first) }
  let(:user)    { create(:user, :consultant, tenant: tenant) }

  subject(:reminder) do
    build(:reminder, tenant: tenant, opportunity: opp, user: user,
          channel: "email", remind_at: 1.hour.from_now)
  end

  describe "validaciones" do
    it { is_expected.to be_valid }

    it "requiere remind_at" do
      reminder.remind_at = nil
      expect(reminder).not_to be_valid
      expect(reminder.errors[:remind_at]).to be_present
    end

    it "requiere canal válido" do
      expect { reminder.channel = "sms" }.to raise_error(ArgumentError)
    end

    it "acepta todos los canales válidos" do
      %w[email whatsapp in_app].each do |ch|
        reminder.channel = ch
        expect(reminder).to be_valid
      end
    end

    it "tiene status pending por defecto" do
      r = create(:reminder, tenant: tenant, opportunity: opp, user: user, remind_at: 1.hour.from_now)
      expect(r.status).to eq("pending")
    end
  end

  describe "scopes" do
    let!(:past_pending)   { create(:reminder, tenant: tenant, opportunity: opp, user: user, remind_at: 1.hour.ago,   status: "pending") }
    let!(:future_pending) { create(:reminder, tenant: tenant, opportunity: opp, user: user, remind_at: 1.hour.from_now, status: "pending") }
    let!(:sent_past)      { create(:reminder, tenant: tenant, opportunity: opp, user: user, remind_at: 1.hour.ago,   status: "sent") }

    it ".due devuelve solo los pending vencidos" do
      expect(Reminder.due).to include(past_pending)
      expect(Reminder.due).not_to include(future_pending)
      expect(Reminder.due).not_to include(sent_past)
    end

    it ".upcoming devuelve pending futuros ordenados" do
      expect(Reminder.upcoming).to include(future_pending)
      expect(Reminder.upcoming).not_to include(past_pending)
    end
  end

  describe "#mark_sent!" do
    it "actualiza status a sent y registra sent_at" do
      reminder.save!
      reminder.mark_sent!
      expect(reminder.reload.status).to eq("sent")
      expect(reminder.sent_at).to be_within(2.seconds).of(Time.current)
    end
  end

  describe "#mark_failed!" do
    it "actualiza status a failed y registra el error" do
      reminder.save!
      reminder.mark_failed!("Timeout")
      expect(reminder.reload.status).to eq("failed")
      expect(reminder.last_error).to eq("Timeout")
      expect(reminder.attempts).to eq(1)
    end

    it "incrementa attempts en cada llamada" do
      reminder.save!
      reminder.mark_failed!("err1")
      reminder.mark_failed!("err2")
      expect(reminder.reload.attempts).to eq(2)
    end
  end
end
