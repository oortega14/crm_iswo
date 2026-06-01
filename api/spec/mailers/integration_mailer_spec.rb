# frozen_string_literal: true

require "rails_helper"

RSpec.describe IntegrationMailer, type: :mailer do
  let(:tenant)      { ActsAsTenant.current_tenant }
  let(:admin)       { create(:user, :admin, tenant: tenant, email: "admin@iswo.co") }
  let(:integration) { create(:ad_integration, tenant: tenant, provider: "meta") }

  describe "#paused" do
    subject(:mail) { described_class.with(integration: integration, user: admin).paused }

    it "envía al email del admin" do
      expect(mail.to).to include(admin.email)
    end

    it "el subject menciona el proveedor" do
      expect(mail.subject).to include("meta")
    end

    it "el subject indica que está pausada" do
      expect(mail.subject.downcase).to include("paus")
    end

    it "no envía si el usuario no tiene email" do
      admin.update_column(:email, "")
      mail = described_class.with(integration: integration, user: admin).paused
      expect(mail.to).to be_nil
    end
  end

  describe "#reconnected" do
    subject(:mail) { described_class.with(integration: integration, user: admin).reconnected }

    it "envía al email del admin" do
      expect(mail.to).to include(admin.email)
    end

    it "el subject indica reconexión exitosa" do
      expect(mail.subject.downcase).to include("reconect")
    end
  end
end
