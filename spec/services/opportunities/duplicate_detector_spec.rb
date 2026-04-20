# frozen_string_literal: true

require "rails_helper"

RSpec.describe Opportunities::DuplicateDetector do
  let(:tenant) { ActsAsTenant.current_tenant || create(:tenant) }

  describe "#call" do
    context "validación de input" do
      it "exige al menos uno de phone/email/full_name" do
        expect { described_class.new.call }.to raise_error(ArgumentError, /phone, email o full_name/)
      end
    end

    context "match exacto por teléfono", :phone_match do
      let!(:contact) { create(:contact, tenant: tenant, phone_e164: "+573001112233") }

      it "encuentra el contacto y reporta score 1.0 / matched_on phone_exact" do
        matches = described_class.new(phone: "+573001112233").call
        expect(matches.size).to eq(1)
        match = matches.first
        expect(match.contact).to eq(contact)
        expect(match.score).to eq(1.0)
        expect(match.matched_on).to eq("phone_exact")
      end

      it "ignora el contacto excluido" do
        matches = described_class.new(phone: "+573001112233", exclude_contact_id: contact.id).call
        expect(matches).to be_empty
      end
    end

    context "match exacto por email" do
      let!(:contact) { create(:contact, tenant: tenant, email: "Cliente@Iswo.co") }

      it "compara case-insensitive y reporta score 0.95" do
        matches = described_class.new(email: "cliente@iswo.co").call
        expect(matches.size).to eq(1)
        expect(matches.first.score).to eq(0.95)
        expect(matches.first.matched_on).to eq("email_exact")
      end
    end

    context "agregación y orden" do
      let!(:contact) do
        create(:contact, tenant: tenant, phone_e164: "+573001112233", email: "x@iswo.co")
      end

      it "deja un solo match por contacto y se queda con la mayor score" do
        matches = described_class.new(phone: "+573001112233", email: "x@iswo.co").call
        expect(matches.map(&:contact)).to eq([contact])
        expect(matches.first.score).to eq(1.0) # phone_exact gana sobre email_exact
      end
    end

    context "umbral" do
      let!(:contact) { create(:contact, tenant: tenant, email: "y@iswo.co") }

      it "filtra resultados por debajo del threshold" do
        matches = described_class.new(email: "y@iswo.co", threshold: 0.99).call
        expect(matches).to be_empty
      end
    end

    describe "Match#as_json" do
      let(:contact) do
        create(:contact, tenant: tenant, phone_e164: "+573001112233",
                         first_name: "Ana", last_name: "Ruiz", email: "ana@iswo.co")
      end

      it "expone preview con datos clave del contacto" do
        match = described_class::Match.new(contact: contact, score: 0.847, matched_on: "phone_trigram")
        json = match.as_json
        expect(json[:contact_id]).to eq(contact.id)
        expect(json[:score]).to eq(0.847)
        expect(json[:matched_on]).to eq("phone_trigram")
        expect(json[:preview]).to include(first_name: "Ana", email: "ana@iswo.co", phone: "+573001112233")
      end
    end
  end
end
