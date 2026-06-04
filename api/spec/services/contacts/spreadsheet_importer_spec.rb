# frozen_string_literal: true

require "rails_helper"
require "csv"
require "tempfile"

RSpec.describe Contacts::SpreadsheetImporter do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:user)   { create(:user, :admin, tenant: tenant) }

  def csv_io(content)
    tf = Tempfile.new(["import", ".csv"])
    tf.write(content)
    tf.rewind
    tf
  end

  describe "#call con CSV" do
    let(:csv_content) do
      "first_name,last_name,email,phone\nAna,Torres,ana@test.co,3001234567\nBeto,López,beto@test.co,3119876543\n"
    end

    it "crea contactos a partir de filas válidas" do
      io = csv_io(csv_content)
      result = described_class.new(tenant: tenant, user: user, io: io, filename: "import.csv").call
      expect(result.created_count).to eq(2)
      expect(result.errors).to be_empty
    end

    it "devuelve error si el archivo supera MAX_ROWS" do
      giant = "first_name,email\n" + (1..2001).map { |i| "Name#{i},u#{i}@t.co" }.join("\n")
      io = csv_io(giant)
      result = described_class.new(tenant: tenant, user: user, io: io, filename: "big.csv").call
      expect(result.errors.first[:message]).to match(/Máximo/)
    end

    it "omite filas completamente en blanco" do
      io = csv_io("first_name,email\n\nAna,ana@t.co\n")
      result = described_class.new(tenant: tenant, user: user, io: io, filename: "blank.csv").call
      expect(result.created_count).to eq(1)
      expect(result.skipped_count).to eq(1)
    end

    it "devuelve error para formato no admitido" do
      io = StringIO.new("datos")
      result = described_class.new(tenant: tenant, user: user, io: io, filename: "file.pdf").call
      expect(result.errors.first[:message]).to match(/Formato no admitido/)
    end

    it "normaliza cabeceras en español" do
      es_csv = "nombre,apellido,correo\nPedro,Ruiz,pedro@t.co\n"
      io = csv_io(es_csv)
      result = described_class.new(tenant: tenant, user: user, io: io, filename: "es.csv").call
      expect(result.created_count).to eq(1)
      contact = ActsAsTenant.with_tenant(tenant) { Contact.last }
      expect(contact.first_name).to eq("Pedro")
    end

    it "infiere kind=company si no hay nombre pero sí empresa" do
      io = csv_io("company,email\nAcme Corp,info@acme.co\n")
      result = described_class.new(tenant: tenant, user: user, io: io, filename: "co.csv").call
      expect(result.created_count).to eq(1)
      contact = ActsAsTenant.with_tenant(tenant) { Contact.last }
      expect(contact.kind).to eq("company")
    end

    it "parte full_name en first_name + last_name" do
      io = csv_io("full_name,email\nJuan Pérez,juan@t.co\n")
      result = described_class.new(tenant: tenant, user: user, io: io, filename: "fn.csv").call
      contact = ActsAsTenant.with_tenant(tenant) { Contact.last }
      expect(contact.first_name).to eq("Juan")
      expect(contact.last_name).to eq("Pérez")
    end
  end
end
