# frozen_string_literal: true

require "rails_helper"

RSpec.describe ReminderNotificationJob, type: :job do
  let(:tenant) { ActsAsTenant.current_tenant }

  describe "#perform" do
    it "corre en cola :critical" do
      expect(described_class.new.queue_name).to eq("critical")
    end

    context "dispatcher" do
      let(:reminder_email)    { build_stubbed(:reminder, :email,    tenant: tenant) }
      let(:reminder_in_app)   { build_stubbed(:reminder,            tenant: tenant, channel: "in_app") }
      let(:reminder_unknown)  { build_stubbed(:reminder,            tenant: tenant, channel: "carrier_pigeon") }

      before do
        # Devolvemos solo el reminder pedido en cada example.
        allow(Reminder).to receive_message_chain(:due, :where).and_return([reminder])
        allow(reminder).to receive(:mark_sent!)
        allow(reminder).to receive(:mark_failed!)
        allow(reminder).to receive(:tenant).and_return(tenant)
      end

      context "channel=email" do
        let(:reminder) { reminder_email }

        it "encola ReminderMailer.due_notification y marca como sent" do
          mailer = double("ActionMailer::MessageDelivery", deliver_later: true)
          chain  = double("Mailer", due_notification: mailer)
          allow(ReminderMailer).to receive(:with).with(reminder: reminder).and_return(chain)
          expect(reminder).to receive(:mark_sent!)
          described_class.new.perform
        end
      end

      context "channel=in_app" do
        let(:reminder) { reminder_in_app }

        it "marca como sent sin tocar mailers" do
          expect(reminder).to receive(:mark_sent!)
          described_class.new.perform
        end
      end

      context "channel desconocido" do
        let(:reminder) { reminder_unknown }

        it "marca como failed con un mensaje descriptivo" do
          expect(reminder).to receive(:mark_failed!).with(/channel_unknown:carrier_pigeon/)
          described_class.new.perform
        end
      end
    end

    context "manejo de excepciones" do
      let(:reminder) { build_stubbed(:reminder, :email, tenant: tenant) }

      before do
        allow(Reminder).to receive_message_chain(:due, :where).and_return([reminder])
        allow(reminder).to receive(:tenant).and_return(tenant)
        allow(ReminderMailer).to receive(:with).and_raise(StandardError, "smtp down")
      end

      it "captura el error y marca el reminder como failed" do
        expect(reminder).to receive(:mark_failed!).with(include("smtp down"))
        described_class.new.perform
      end
    end
  end
end
