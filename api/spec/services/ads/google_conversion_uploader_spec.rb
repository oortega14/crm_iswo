# frozen_string_literal: true

require "rails_helper"

RSpec.describe Ads::GoogleConversionUploader do
  let(:tenant)      { ActsAsTenant.current_tenant }
  let(:credentials) do
    {
      "refresh_token"        => "1//fake-refresh",
      "customer_id"          => "123-456-7890",
      "conversion_action_id" => "999",
      "developer_token"      => "fake-dev-token"
    }
  end
  let(:integration) do
    build_stubbed(:ad_integration, :google,
                  tenant:             tenant,
                  credentials:        credentials,
                  account_identifier: "1234567890")
  end

  let(:gclid)    { "TeSter12345xYz" }
  let(:datetime) { Time.zone.parse("2026-05-28 10:00:00") }
  let(:uploader) do
    described_class.new(
      integration:         integration,
      gclid:               gclid,
      conversion_datetime: datetime,
      conversion_value:    5_000_000,
      currency_code:       "COP"
    )
  end

  before do
    stub_const("ENV", ENV.to_hash.merge(
      "GOOGLE_ADS_CLIENT_ID"     => "fake-client-id",
      "GOOGLE_ADS_CLIENT_SECRET" => "fake-client-secret"
    ))
  end

  describe "#call" do
    context "con gclid vacío" do
      let(:gclid) { "  " }

      it "devuelve error sin llamar a la red" do
        result = uploader.call
        expect(result).not_to be_success
        expect(result.message).to include("gclid vacío")
      end
    end

    context "cuando el OAuth falla" do
      before do
        stub_request(:post, "https://oauth2.googleapis.com/token")
          .to_return(
            status: 400,
            body:   { error: "invalid_grant", error_description: "Token revocado" }.to_json,
            headers: { "Content-Type" => "application/json" }
          )
      end

      it "devuelve error con hint sobre refresh token" do
        result = uploader.call
        expect(result).not_to be_success
        expect(result.message).to include("Refresh token revocado")
      end
    end

    context "cuando el OAuth funciona y Google acepta la conversión" do
      before do
        stub_request(:post, "https://oauth2.googleapis.com/token")
          .to_return(
            status: 200,
            body:   { access_token: "ya29.fake", expires_in: 3600 }.to_json,
            headers: { "Content-Type" => "application/json" }
          )

        stub_request(:post, "https://googleads.googleapis.com/v17/customers/1234567890:uploadClickConversions")
          .to_return(
            status: 200,
            body:   { results: [{}] }.to_json,
            headers: { "Content-Type" => "application/json" }
          )
      end

      it "devuelve ok" do
        result = uploader.call
        expect(result).to be_success
        expect(result.partial_errors).to be_empty
      end

      it "envía los headers de autenticación correctos" do
        uploader.call
        expect(WebMock).to have_requested(:post, /uploadClickConversions/)
          .with(headers: { "Authorization" => "Bearer ya29.fake", "developer-token" => "fake-dev-token" })
      end

      it "normaliza customer_id eliminando guiones" do
        uploader.call
        expect(WebMock).to have_requested(:post, /customers\/1234567890:uploadClickConversions/)
      end

      it "incluye conversionAction con el ID correcto" do
        uploader.call
        expect(WebMock).to have_requested(:post, /uploadClickConversions/)
          .with(body: hash_including(
            "conversions" => array_including(
              hash_including(
                "gclid"            => gclid,
                "conversionAction" => "customers/1234567890/conversionActions/999",
                "conversionValue"  => 5_000_000.0,
                "currencyCode"     => "COP"
              )
            )
          ))
      end
    end

    context "cuando Google devuelve partialFailure" do
      before do
        stub_request(:post, "https://oauth2.googleapis.com/token")
          .to_return(
            status: 200,
            body:   { access_token: "ya29.fake" }.to_json,
            headers: { "Content-Type" => "application/json" }
          )

        stub_request(:post, /uploadClickConversions/)
          .to_return(
            status: 200,
            body:   {
              partialFailureError: [{ message: "gclid inválido o expirado" }]
            }.to_json,
            headers: { "Content-Type" => "application/json" }
          )
      end

      it "devuelve error con partial_errors" do
        result = uploader.call
        expect(result).not_to be_success
        expect(result.partial_errors).to include("gclid inválido o expirado")
      end
    end

    context "cuando Google responde 401" do
      before do
        stub_request(:post, "https://oauth2.googleapis.com/token")
          .to_return(
            status: 200,
            body:   { access_token: "ya29.fake" }.to_json,
            headers: { "Content-Type" => "application/json" }
          )

        stub_request(:post, /uploadClickConversions/)
          .to_return(
            status: 401,
            body:   { error: { message: "Request had invalid authentication credentials." } }.to_json,
            headers: { "Content-Type" => "application/json" }
          )
      end

      it "devuelve error con código HTTP" do
        result = uploader.call
        expect(result).not_to be_success
        expect(result.message).to include("401")
      end
    end

    context "sin GOOGLE_ADS_CLIENT_ID en ENV" do
      before do
        stub_const("ENV", ENV.to_hash.merge("GOOGLE_ADS_CLIENT_ID" => "", "GOOGLE_ADS_CLIENT_SECRET" => "x"))
      end

      it "devuelve error antes de llamar a la red" do
        result = uploader.call
        expect(result).not_to be_success
        expect(result.message).to include("GOOGLE_ADS_CLIENT_ID")
      end
    end

    context "sin customer_id en credenciales ni account_identifier" do
      let(:credentials) { { "refresh_token" => "1//fake", "conversion_action_id" => "9", "developer_token" => "d" } }
      let(:integration) do
        build_stubbed(:ad_integration, :google,
                      tenant:             tenant,
                      credentials:        credentials,
                      account_identifier: nil)
      end

      before do
        stub_request(:post, "https://oauth2.googleapis.com/token")
          .to_return(
            status: 200,
            body:   { access_token: "ya29.fake" }.to_json,
            headers: { "Content-Type" => "application/json" }
          )
      end

      it "devuelve error descriptivo" do
        result = uploader.call
        expect(result).not_to be_success
        expect(result.message).to include("customer_id")
      end
    end

    context "con developer_token en ENV como fallback" do
      let(:credentials) do
        {
          "refresh_token"        => "1//fake-refresh",
          "customer_id"          => "1234567890",
          "conversion_action_id" => "999"
        }
      end

      before do
        stub_const("ENV", ENV.to_hash.merge(
          "GOOGLE_ADS_CLIENT_ID"       => "fake-client-id",
          "GOOGLE_ADS_CLIENT_SECRET"   => "fake-client-secret",
          "GOOGLE_ADS_DEVELOPER_TOKEN" => "env-dev-token"
        ))
        stub_request(:post, "https://oauth2.googleapis.com/token")
          .to_return(
            status: 200,
            body:   { access_token: "ya29.fake" }.to_json,
            headers: { "Content-Type" => "application/json" }
          )
        stub_request(:post, /uploadClickConversions/)
          .to_return(
            status: 200,
            body:   { results: [{}] }.to_json,
            headers: { "Content-Type" => "application/json" }
          )
      end

      it "usa el developer_token del ENV" do
        uploader.call
        expect(WebMock).to have_requested(:post, /uploadClickConversions/)
          .with(headers: { "developer-token" => "env-dev-token" })
      end
    end
  end
end
