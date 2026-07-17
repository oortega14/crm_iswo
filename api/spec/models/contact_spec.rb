# frozen_string_literal: true

require "rails_helper"

RSpec.describe Contact, type: :model do
  let(:tenant) { ActsAsTenant.current_tenant }
  subject { build(:contact, tenant: tenant) }

  describe "asociaciones" do
    it { is_expected.to belong_to(:tenant).optional }
    it { is_expected.to belong_to(:owner_user).class_name("User").optional }
    it { is_expected.to have_many(:opportunities).dependent(:destroy) }
    it { is_expected.to have_many(:landing_form_submissions).dependent(:nullify) }
    it { is_expected.to have_many(:whatsapp_messages).dependent(:nullify) }
  end

  describe "validaciones" do
    it "solo acepta valores de enum kind válidos" do
      Contact::KINDS.each { |k| expect(build(:contact, kind: k)).to be_valid }
    end
    it { is_expected.to allow_value("").for(:email) }
    it { is_expected.to allow_value(nil).for(:email) }
    it { is_expected.to allow_value("prospect@iswo.co").for(:email) }
    it { is_expected.not_to allow_value("not-an-email").for(:email) }

    it "exige nombre O razón social" do
      contact = build(:contact, tenant: tenant, first_name: nil, last_name: nil, company_name: nil)
      expect(contact).not_to be_valid
      expect(contact.errors[:base]).to include(/nombre o razón social/)
    end

    it "acepta si solo hay company_name" do
      contact = build(:contact, :company, tenant: tenant, first_name: nil, last_name: nil)
      expect(contact).to be_valid
    end

    it "rechaza phone_e164 inválido" do
      contact = build(:contact, tenant: tenant, phone_e164: "123abc", country: "CO")
      expect(contact).not_to be_valid
      expect(contact.errors[:phone_e164]).to be_present
    end
  end

  describe "callbacks de normalización" do
    it "downcase + strip del email" do
      contact = build(:contact, tenant: tenant, email: "  OSCAR@ISWO.CO ")
      contact.valid?
      expect(contact.email).to eq("oscar@iswo.co")
    end

    it "normaliza phone_e164 y phone_normalized para búsqueda legado" do
      contact = build(:contact, tenant: tenant, phone_e164: "+573001234567", country: "CO")
      contact.valid?
      expect(contact.phone_e164).to eq("+573001234567")
      expect(contact.phone_normalized).to eq("573001234567")
    end
  end

  describe "cifrado PII (Fase 2)" do
    it "persiste document_id cifrado con blind index" do
      contact = create(:contact, tenant: tenant, document_id: "1234567890")
      expect(contact.document_id_ciphertext).to be_present
      expect(contact.document_id_bidx).to be_present
      expect(contact.document_id).to eq("1234567890")
      expect(Contact.find_by(document_id: "1234567890")).to eq(contact)
    end

    it "persiste phone_e164 cifrado y permite búsqueda exacta" do
      contact = create(:contact, tenant: tenant, phone_e164: "+573001234567", country: "CO")
      expect(contact.phone_e164_ciphertext).to be_present
      expect(contact.phone_e164).to eq("+573001234567")
      expect(contact.phone_normalized).to eq("573001234567")
      expect(Contact.find_by(phone_e164: "+573001234567")).to eq(contact)
    end
  end

  describe "enum kind" do
    it "expone predicate methods prefijados" do
      expect(build(:contact, tenant: tenant, kind: "person").kind_person?).to be(true)
      expect(build(:contact, :company, tenant: tenant).kind_company?).to be(true)
    end
  end

  describe "scopes" do
    it ".persons y .companies filtran por kind" do
      person  = create(:contact, tenant: tenant)
      company = create(:contact, :company, tenant: tenant)

      expect(Contact.persons).to include(person)
      expect(Contact.persons).not_to include(company)
      expect(Contact.companies).to include(company)
      expect(Contact.companies).not_to include(person)
    end

    it ".with_phone excluye contactos sin phone_normalized" do
      with_phone = create(:contact, tenant: tenant, phone_e164: "+573001234567", country: "CO")
      create(:contact, :without_phone, tenant: tenant)

      expect(Contact.with_phone).to include(with_phone)
      expect(Contact.with_phone.count).to eq(1)
    end
  end

  describe "#display_name" do
    it "devuelve company_name para empresas" do
      c = build(:contact, :company, tenant: tenant, company_name: "ACME S.A.S.")
      expect(c.display_name).to eq("ACME S.A.S.")
    end

    it "concatena first_name + last_name para personas" do
      c = build(:contact, tenant: tenant, first_name: "Oscar", last_name: "Ortega")
      expect(c.display_name).to eq("Oscar Ortega")
    end

    it "usa email como fallback si no hay nombres" do
      c = build(:contact, tenant: tenant, first_name: nil, last_name: nil, company_name: "x", kind: "person", email: "ghost@iswo.co")
      # company_name "x" sólo para pasar validación name_or_company_present
      c.kind = "person"
      c.company_name = nil
      c.first_name = nil
      c.last_name = nil
      expect(c.display_name).to eq("ghost@iswo.co")
    end
  end
end
