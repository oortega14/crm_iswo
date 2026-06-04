# frozen_string_literal: true

require "rails_helper"

RSpec.describe Exports::FileBuilder do
  let(:tenant)  { ActsAsTenant.current_tenant }
  let(:contact) { create(:contact, tenant: tenant, first_name: "Ana", last_name: "Torres") }
  let(:scope)   { ActsAsTenant.with_tenant(tenant) { Contact.where(id: contact.id) } }

  after do
    Dir[Rails.root.join("tmp", "exports", "sync", "*.{csv,xlsx}")].each { |f| File.delete(f) if File.exist?(f) }
  end

  describe ".build (CSV)" do
    it "genera un archivo CSV con la fila del contacto" do
      result = described_class.build(scope: scope, resource: "contacts", format: "csv")
      expect(File.exist?(result.path)).to be(true)
      expect(result.row_count).to eq(1)
      expect(result.filename).to end_with(".csv")
      content = File.read(result.path)
      expect(content).to include("Ana")
    end

    it "genera CSV vacío (solo cabeceras) si el scope está vacío" do
      result = described_class.build(scope: Contact.none, resource: "contacts", format: "csv")
      expect(result.row_count).to eq(0)
      expect(File.exist?(result.path)).to be(true)
    end
  end

  describe ".build (XLSX)" do
    it "genera un archivo XLSX" do
      result = described_class.build(scope: scope, resource: "contacts", format: "xlsx")
      expect(File.exist?(result.path)).to be(true)
      expect(result.row_count).to eq(1)
      expect(result.filename).to end_with(".xlsx")
    end
  end

  describe "formato inválido" do
    it "lanza ArgumentError" do
      expect {
        described_class.build(scope: scope, resource: "contacts", format: "pdf")
      }.to raise_error(ArgumentError, /Formato no soportado/)
    end
  end
end
