# frozen_string_literal: true

require "rails_helper"

RSpec.describe UserMailer, type: :mailer do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:user)   { create(:user, :consultant, tenant: tenant, email: "user@iswo.co") }

  describe "#welcome" do
    subject(:mail) { described_class.with(user: user).welcome }

    it "envía al email del usuario" do
      expect(mail.to).to include(user.email)
    end

    it "el subject menciona el nombre del tenant" do
      expect(mail.subject).to include(tenant.name)
    end
  end

  describe "#password_reset" do
    subject(:mail) { described_class.with(user: user, reset_token: "tok123").password_reset }

    it "envía al email del usuario" do
      expect(mail.to).to include(user.email)
    end

    it "el subject menciona restablecer contraseña" do
      expect(mail.subject.downcase).to include("contraseña")
    end
  end

  describe "#account_activated" do
    subject(:mail) { described_class.with(user: user).account_activated }

    it "envía al email del usuario" do
      expect(mail.to).to include(user.email)
    end

    it "el subject menciona reactivación" do
      expect(mail.subject).to include("reactivada")
    end
  end
end
