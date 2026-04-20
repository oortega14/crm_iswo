# frozen_string_literal: true

require "rails_helper"

RSpec.describe LandingSubmissionProcessor do
  let(:tenant)    { ActsAsTenant.current_tenant }
  let!(:pipeline) { create(:pipeline_with_stages, tenant: tenant, is_default: true) }
  let!(:source)   { create(:lead_source, tenant: tenant, kind: "web") }
  let!(:owner)    { create(:user, tenant: tenant, role: "consultant") }
  let!(:landing)  { create(:landing_page, tenant: tenant, slug: "promo") }

  let(:payload) do
    { "name" => "Ana Ruiz", "email" => "ana@iswo.co", "phone" => "+573001112233" }
  end
  let(:submission) do
    create(:landing_form_submission, tenant: tenant, landing_page: landing, payload: payload)
  end

  describe "#call" do
    context "sin duplicados" do
      it "crea Contact, Opportunity y marca submission como procesado" do
        expect { described_class.new(submission).call }
          .to change(Contact, :count).by(1)
          .and change(Opportunity, :count).by(1)

        submission.reload
        expect(submission.processed_at).to be_present
        expect(submission.contact).to be_present
        expect(submission.opportunity).to be_present
      end

      it "asocia el contacto al lead source 'web'" do
        described_class.new(submission).call
        opp = submission.reload.opportunity
        expect(opp.lead_source).to eq(source)
      end
    end

    context "con duplicado" do
      let!(:existing_contact) do
        create(:contact, tenant: tenant, email: "ana@iswo.co", phone_e164: "+573001112233")
      end

      it "reusa el contacto existente y NO crea uno nuevo" do
        expect { described_class.new(submission).call }
          .not_to change(Contact, :count)

        expect(submission.reload.contact).to eq(existing_contact)
      end
    end

    context "ante una excepción" do
      before do
        allow_any_instance_of(described_class).to receive(:find_or_create_contact!)
          .and_raise(ActiveRecord::RecordInvalid.new(Contact.new))
      end

      it "captura, devuelve false y guarda process_error" do
        expect(described_class.new(submission).call).to be(false)
        expect(submission.reload.process_error).to be_present
      end
    end
  end

  describe "extracción de payload" do
    it "respeta first_name/last_name explícitos" do
      submission.update!(payload: { "first_name" => "Ana", "last_name" => "Ruiz",
                                    "email" => "ana2@iswo.co" })
      described_class.new(submission).call
      contact = submission.reload.contact
      expect(contact.first_name).to eq("Ana")
      expect(contact.last_name).to eq("Ruiz")
    end

    it "normaliza teléfonos a E.164 con código de país del tenant" do
      tenant.update!(country_code: "CO") if tenant.respond_to?(:country_code=)
      submission.update!(payload: { "name" => "X", "phone" => "300 111 2233", "email" => "x@iswo.co" })
      described_class.new(submission).call
      contact = submission.reload.contact
      expect(contact.phone_e164).to start_with("+57")
    end
  end
end
