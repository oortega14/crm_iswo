# frozen_string_literal: true

require "rails_helper"

RSpec.describe ExportMailer, type: :mailer do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:user)   { create(:user, :admin, tenant: tenant, email: "admin@iswo.co") }
  let(:export) { create(:export, tenant: tenant, user: user, resource: "contacts", format: "csv") }

  describe "#ready" do
    subject(:mail) { described_class.with(export: export).ready }

    it "envía al email del usuario" do
      expect(mail.to).to include(user.email)
    end

    it "el subject menciona el recurso" do
      expect(mail.subject).to include("contacts")
    end
  end

  describe "#failed" do
    subject(:mail) { described_class.with(export: export).failed }

    it "envía al email del usuario" do
      expect(mail.to).to include(user.email)
    end

    it "el subject indica fallo" do
      expect(mail.subject).to include("falló")
    end
  end

  describe "no envía si el usuario no tiene email" do
    it "devuelve un mail sin destinatarios" do
      user.update_column(:email, "")
      mail = described_class.with(export: export).ready
      expect(mail.to).to be_nil
    end
  end
end
