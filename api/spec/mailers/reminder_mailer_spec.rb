# frozen_string_literal: true

require "rails_helper"

RSpec.describe ReminderMailer, type: :mailer do
  let(:tenant)   { ActsAsTenant.current_tenant }
  let(:user)     { create(:user, :consultant, tenant: tenant, email: "consul@iswo.co") }
  let(:pipeline) { create(:pipeline_with_stages, tenant: tenant) }
  let(:contact)  { create(:contact, tenant: tenant) }
  let(:opp) do
    create(:opportunity, tenant: tenant, contact: contact,
           pipeline: pipeline, pipeline_stage: pipeline.pipeline_stages.first)
  end
  let(:reminder) do
    create(:reminder, tenant: tenant, opportunity: opp, user: user,
           channel: "email", remind_at: 1.hour.from_now)
  end

  describe "#due_notification" do
    subject(:mail) { described_class.with(reminder: reminder).due_notification }

    it "envía al email del consultor" do
      expect(mail.to).to include(user.email)
    end

    it "el subject incluye Recordatorio" do
      expect(mail.subject).to include("Recordatorio")
    end

    it "no envía si el usuario no tiene email" do
      user.update_column(:email, "")
      mail = described_class.with(reminder: reminder).due_notification
      expect(mail.to).to be_nil
    end
  end

  describe "#created_confirmation" do
    subject(:mail) { described_class.with(reminder: reminder).created_confirmation }

    it "confirma la programación al consultor" do
      expect(mail.to).to include(user.email)
      expect(mail.subject).to include("programado")
    end
  end

  describe "#upcoming_due_notification" do
    subject(:mail) { described_class.with(reminder: reminder).upcoming_due_notification }

    it "avisa que el recordatorio está por vencer" do
      expect(mail.to).to include(user.email)
      expect(mail.subject).to include("por vencer")
    end
  end
end
