# frozen_string_literal: true

require "rails_helper"

RSpec.describe UploadGoogleConversionJob, type: :job do
  let(:tenant) { ActsAsTenant.current_tenant }

  describe "#perform" do
    it "corre en cola :integrations" do
      expect(described_class.new.queue_name).to eq("integrations")
    end

    context "cuando la oportunidad no existe" do
      it "no lanza excepción" do
        expect { described_class.perform_now(999_999) }.not_to raise_error
      end
    end

    context "cuando la oportunidad no tiene gcl_id" do
      let(:opportunity) { create(:opportunity, tenant: tenant, status: "won", custom_fields: {}) }

      it "no llama al uploader" do
        expect(Ads::GoogleConversionUploader).not_to receive(:new)
        described_class.perform_now(opportunity.id)
      end
    end

    context "cuando no hay AdIntegration Google activa" do
      let(:opportunity) do
        create(:opportunity, tenant: tenant, status: "won",
               custom_fields: { "gcl_id" => "TeSter123" })
      end

      it "no llama al uploader" do
        expect(Ads::GoogleConversionUploader).not_to receive(:new)
        described_class.perform_now(opportunity.id)
      end
    end

    context "con gcl_id e integración Google activa" do
      let(:opportunity) do
        create(:opportunity, tenant: tenant, status: "won", estimated_value: 2_000_000,
               custom_fields: { "gcl_id" => "CL_abc123XYZ" })
      end
      let!(:integration) do
        create(:ad_integration, :google, tenant: tenant, status: "active",
               credentials: {
                 "refresh_token"        => "1//fake",
                 "customer_id"          => "1234567890",
                 "conversion_action_id" => "42",
                 "developer_token"      => "fake-dev"
               })
      end
      let(:uploader_double) { instance_double(Ads::GoogleConversionUploader) }

      before do
        allow(Ads::GoogleConversionUploader).to receive(:new).and_return(uploader_double)
      end

      context "cuando la subida es exitosa" do
        before do
          allow(uploader_double).to receive(:call).and_return(
            Ads::GoogleConversionUploader::Result.new(ok: true, message: nil, partial_errors: [])
          )
        end

        it "llama al uploader con los parámetros correctos" do
          described_class.perform_now(opportunity.id)

          expect(Ads::GoogleConversionUploader).to have_received(:new).with(
            integration:         integration,
            gclid:               "CL_abc123XYZ",
            conversion_datetime: anything,
            conversion_value:    2_000_000.0,
            currency_code:       opportunity.currency
          )
        end

        it "registra un opportunity_log con action google_conversion_upload" do
          expect {
            described_class.perform_now(opportunity.id)
          }.to change { opportunity.opportunity_logs.where(action: "google_conversion_upload").count }.by(1)
        end

        it "el log contiene success: true" do
          described_class.perform_now(opportunity.id)
          log = opportunity.opportunity_logs.find_by(action: "google_conversion_upload")
          expect(log.changes_data["success"]).to be true
        end
      end

      context "cuando la subida falla" do
        before do
          allow(uploader_double).to receive(:call).and_return(
            Ads::GoogleConversionUploader::Result.new(
              ok: false,
              message: "gclid inválido",
              partial_errors: ["gclid inválido o expirado"]
            )
          )
        end

        it "registra el log con success: false" do
          described_class.perform_now(opportunity.id)
          log = opportunity.opportunity_logs.find_by(action: "google_conversion_upload")
          expect(log.changes_data["success"]).to be false
          expect(log.note).to include("Error")
        end
      end
    end
  end

  describe "callback after_commit en Opportunity" do
    let!(:google_integration) do
      create(:ad_integration, :google, tenant: tenant, status: "active",
             credentials: {
               "refresh_token"        => "1//fake",
               "customer_id"          => "1234567890",
               "conversion_action_id" => "42",
               "developer_token"      => "fake-dev"
             })
    end
    let(:opportunity) do
      create(:opportunity, tenant: tenant, status: "new_lead",
             custom_fields: { "gcl_id" => "CL_trigger_test" })
    end

    it "encola el job al pasar a won" do
      expect {
        opportunity.update!(status: "won")
      }.to have_enqueued_job(described_class).with(opportunity.id)
    end

    it "no encola el job al pasar a lost" do
      expect {
        opportunity.update!(status: "lost")
      }.not_to have_enqueued_job(described_class)
    end

    it "no encola el job en actualizaciones que no cambien el status" do
      opportunity.update!(status: "won")
      clear_enqueued_jobs

      expect {
        opportunity.update!(title: "Nuevo título")
      }.not_to have_enqueued_job(described_class)
    end
  end
end
