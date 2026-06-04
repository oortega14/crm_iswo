# frozen_string_literal: true

require "rails_helper"

RSpec.describe Exports::Storage do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:user)   { create(:user, :manager, tenant: tenant) }
  let(:export) { create(:export, tenant: tenant, user: user, resource: "contacts", format: "csv") }

  describe ".persist! / .download_payload" do
    let(:plaintext) do
      path = Rails.root.join("tmp", "test_export_#{export.id}.csv")
      File.write(path, "first_name,email\nAna,ana@test.co\n")
      path.to_s
    end

    after do
      described_class.delete!(export)
      FileUtils.rm_f(plaintext)
    end

    it "cifra en disco y devuelve referencia local (no URL pública)" do
      ref = described_class.persist!(export, plaintext)

      expect(ref).to eq(described_class::LOCAL_MARKER)
      expect(File.exist?(described_class.encrypted_path(export))).to be true
      expect(File.exist?(described_class.plain_storage_path(export))).to be false
      expect(File.binread(described_class.encrypted_path(export))).not_to include("first_name")
    end

    it "descifra al descargar" do
      described_class.persist!(export, plaintext)
      export.update!(file_url: described_class::LOCAL_MARKER, status: "succeeded")
      payload = described_class.download_payload(export.reload)

      expect(payload[:type]).to eq(:data)
      expect(payload[:data]).to include("first_name")
      expect(payload[:data]).to include("Ana")
    end
  end

  describe ".delete!" do
    it "elimina el archivo cifrado local" do
      path = Rails.root.join("tmp", "test_export_del_#{export.id}.csv")
      File.write(path, "x")
      described_class.persist!(export, path.to_s)
      expect(File.exist?(described_class.encrypted_path(export))).to be true

      described_class.delete!(export)
      expect(File.exist?(described_class.encrypted_path(export))).to be false
      FileUtils.rm_f(path)
    end
  end
end
