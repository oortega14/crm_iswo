# frozen_string_literal: true

require "rails_helper"

RSpec.describe AdSyncJob, type: :job do
  let(:tenant)      { ActsAsTenant.current_tenant }
  let!(:integration) { create(:ad_integration, tenant: tenant, provider: "meta", status: "active") }

  let(:ok_result)   { instance_double(Ads::ConnectionTester::Result, success?: true, message: nil) }
  let(:fail_result) { instance_double(Ads::ConnectionTester::Result, success?: false, message: "Timeout") }

  describe "#perform" do
    it "llama al ConnectionTester para cada integración activa" do
      allow_any_instance_of(Ads::ConnectionTester).to receive(:test).and_return(ok_result)
      expect_any_instance_of(Ads::ConnectionTester).to receive(:test).once
      described_class.new.perform
    end

    it "llama record_sync! cuando la conexión es exitosa" do
      allow_any_instance_of(Ads::ConnectionTester).to receive(:test).and_return(ok_result)
      allow_any_instance_of(AdIntegration).to receive(:record_sync!)
      expect_any_instance_of(AdIntegration).to receive(:record_sync!)
      described_class.new.perform
    end

    it "llama record_failure! cuando la conexión falla" do
      allow_any_instance_of(Ads::ConnectionTester).to receive(:test).and_return(fail_result)
      allow_any_instance_of(AdIntegration).to receive(:record_failure!)
      expect_any_instance_of(AdIntegration).to receive(:record_failure!).with("Timeout")
      described_class.new.perform
    end

    it "pausa la integración tras MAX_CONSECUTIVE_FAILURES fallos" do
      allow_any_instance_of(Ads::ConnectionTester).to receive(:test).and_return(fail_result)
      allow_any_instance_of(AdIntegration).to receive(:record_failure!)
      integration.update!(consecutive_failures: AdSyncJob::MAX_CONSECUTIVE_FAILURES)

      described_class.new.perform
      expect(integration.reload.status).to eq("paused")
    end

    it "no pausa si los fallos son menores al umbral" do
      allow_any_instance_of(Ads::ConnectionTester).to receive(:test).and_return(fail_result)
      allow_any_instance_of(AdIntegration).to receive(:record_failure!)
      integration.update!(consecutive_failures: 1)

      described_class.new.perform
      expect(integration.reload.status).to eq("active")
    end

    it "ignora integraciones no activas" do
      integration.update!(status: "paused")
      expect_any_instance_of(Ads::ConnectionTester).not_to receive(:test)
      described_class.new.perform
    end
  end
end
