# frozen_string_literal: true

require "rails_helper"

RSpec.describe RefreshDuplicateCacheJob, type: :job do
  let(:tenant) { ActsAsTenant.current_tenant }

  describe "#perform" do
    it "no lanza error en un tenant sin contactos recientes" do
      expect { described_class.new.perform }.not_to raise_error
    end

    it "no procesa contactos creados hace más de 24h" do
      # Contact antiguo no debe ser escaneado
      create(:contact, tenant: tenant, created_at: 25.hours.ago)
      expect_any_instance_of(Opportunities::DuplicateDetector).not_to receive(:call)
      described_class.new.perform
    end
  end
end
