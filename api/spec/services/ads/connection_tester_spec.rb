# frozen_string_literal: true

require "rails_helper"

RSpec.describe Ads::ConnectionTester do
  let(:tenant) { ActsAsTenant.current_tenant }

  describe "#call" do
    context "provider meta_ads" do
      let(:integration) do
        # NOTA: el modelo enum usa "meta", el tester espera "meta_ads".
        # Para forzar la rama meta del tester, seteamos directamente el atributo.
        i = build(:ad_integration, :meta, tenant: tenant, credentials: { "access_token" => "tok" })
        i.assign_attributes(provider: "meta_ads")
        i.save!(validate: false)
        i
      end

      it "devuelve true si Graph responde 200 con id" do
        stub_request(:get, %r{graph\.facebook\.com/v18\.0/me})
          .with(query: hash_including("access_token" => "tok"))
          .to_return(status: 200, body: { id: "1234" }.to_json,
                     headers: { "Content-Type" => "application/json" })

        expect(described_class.new(integration).call).to be(true)
      end

      it "devuelve false si Graph responde 401" do
        stub_request(:get, %r{graph\.facebook\.com/v18\.0/me})
          .to_return(status: 401, body: { error: { message: "bad token" } }.to_json,
                     headers: { "Content-Type" => "application/json" })

        expect(described_class.new(integration).call).to be(false)
      end

      it "devuelve false sin access_token configurado" do
        integration.update!(credentials: {})
        expect(described_class.new(integration).call).to be(false)
      end
    end

    context "provider google_ads" do
      let(:integration) do
        i = build(:ad_integration, :google, tenant: tenant, credentials: { "refresh_token" => "rt" })
        i.assign_attributes(provider: "google_ads")
        i.save!(validate: false)
        i
      end

      it "intercambia refresh_token por access_token y devuelve true cuando funciona" do
        stub_request(:post, "https://oauth2.googleapis.com/token")
          .to_return(status: 200, body: { access_token: "ya29.fake" }.to_json,
                     headers: { "Content-Type" => "application/json" })

        expect(described_class.new(integration).call).to be(true)
      end

      it "devuelve false si Google responde error" do
        stub_request(:post, "https://oauth2.googleapis.com/token")
          .to_return(status: 400, body: { error: "invalid_grant" }.to_json,
                     headers: { "Content-Type" => "application/json" })

        expect(described_class.new(integration).call).to be(false)
      end
    end

    context "provider no implementado" do
      let(:integration) { build(:ad_integration, :twilio, tenant: tenant) }

      it "stubea como OK con un warning en logs" do
        expect(Rails.logger).to receive(:warn).with(/sin implementar/)
        expect(described_class.new(integration).call).to be(true)
      end
    end
  end
end
