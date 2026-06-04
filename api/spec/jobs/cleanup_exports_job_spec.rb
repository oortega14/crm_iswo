# frozen_string_literal: true

require "rails_helper"

RSpec.describe CleanupExportsJob, type: :job do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:user)   { create(:user, :admin, tenant: tenant) }

  let!(:expired_export) do
    create(:export, tenant: tenant, user: user,
           resource: "contacts", format: "csv",
           status: "succeeded", expires_at: 2.days.ago)
  end
  let!(:active_export) do
    create(:export, tenant: tenant, user: user,
           resource: "contacts", format: "csv",
           status: "succeeded", expires_at: 2.days.from_now)
  end

  before do
    allow(Exports::Storage).to receive(:delete!).and_return(true)
  end

  describe "#perform" do
    it "marca como expired los exports con expires_at pasado" do
      described_class.new.perform
      expect(expired_export.reload.status).to eq("expired")
    end

    it "borra el archivo del storage" do
      expect(Exports::Storage).to receive(:delete!).with(expired_export)
      described_class.new.perform
    end

    it "limpia el file_url del export expirado" do
      described_class.new.perform
      expect(expired_export.reload.file_url).to be_nil
    end

    it "no toca exports con expires_at futuro" do
      described_class.new.perform
      expect(active_export.reload.status).to eq("succeeded")
    end

    it "no falla si Storage.delete! lanza una excepción" do
      allow(Exports::Storage).to receive(:delete!).and_raise(StandardError, "S3 error")
      expect { described_class.new.perform }.not_to raise_error
    end
  end
end
