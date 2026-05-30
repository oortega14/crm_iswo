# frozen_string_literal: true

require "rails_helper"

RSpec.describe ExportGenerationJob, type: :job do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:user)   { create(:user, tenant: tenant, role: "manager") }

  describe "#perform" do
    it "corre en cola :exports" do
      expect(described_class.new.queue_name).to eq("exports")
    end

    context "formato csv (sin dependencias binarias)" do
      let(:export) { create(:export, tenant: tenant, user: user, resource: "contacts", format: "csv") }

      before do
        create_list(:contact, 2, tenant: tenant)
      end

      it "genera el CSV y marca el export como succeeded" do
        described_class.new.perform(export.id)

        export.reload
        expect(export.status).to eq("succeeded")
        expect(export.file_url).to eq(Exports::Storage::LOCAL_MARKER)
        expect(Exports::Storage.encrypted_file?(export)).to be true
        expect(export.file_size).to be > 0
        expect(export.finished_at).to be_present
        expect(export.expires_at).to be > 6.days.from_now
      ensure
        Exports::Storage.delete!(export) if export.persisted?
      end

      it "encola ExportMailer.ready si el user tiene email" do
        mailer = double("ActionMailer::MessageDelivery", deliver_later: true)
        chain  = double("Mailer", ready: mailer)
        allow(ExportMailer).to receive(:with).with(export: export).and_return(chain)

        described_class.new.perform(export.id)
      end
    end

    context "recurso desconocido" do
      # Rails 8.1 enums no permiten cargar valores inválidos desde DB.
      # Simulamos el error de "recurso no soportado" stubando el método
      # que construye el scope interno del job.
      let(:export) { create(:export, tenant: tenant, user: user, resource: "contacts", format: "csv") }

      it "marca el export como failed con el mensaje del error" do
        allow_any_instance_of(described_class).to receive(:collection)
          .and_raise(RuntimeError, "Recurso no soportado: unicorns")

        described_class.new.perform(export.id)
        export.reload
        expect(export.status).to eq("failed")
        expect(export.error_message).to match(/Recurso no soportado/)
      end
    end

    it "no hace nada si el export fue eliminado antes de correr" do
      expect { described_class.new.perform(0) }.not_to raise_error
    end
  end
end
