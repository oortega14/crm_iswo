# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Passwords", :without_tenant, type: :request do
  # Sin el tenant por defecto del support: si no, acts_as_tenant asigna el User al tenant
  # equivocado y el API (X-Tenant-Slug: acme-co) no encuentra el correo ni el token.
  let(:tenant) { create(:tenant, slug: "acme-co") }
  let!(:user) do
    with_tenant(tenant) do
      create(:user, tenant: tenant, email: "alice@example.com", password: "Oldsecret12")
    end
  end

  describe "POST /api/v1/password/forgot" do
    it "responde 202 y envía correo cuando el usuario existe en el tenant" do
      expect do
        post "/api/v1/password/forgot",
             params: { email: user.email },
             headers: { "X-Tenant-Slug" => tenant.slug },
             as: :json
      end.to change { ActionMailer::Base.deliveries.size }.by(1)

      expect(response).to have_http_status(:accepted)
      mail = ActionMailer::Base.deliveries.last
      expect(mail.to).to include(user.email)
      body = mail.body.encoded
      expect(body).to include("reset-password")
      expect(body).to include(tenant.slug)
    end

    it "responde 202 sin correo si el email no existe (sin filtrar emails)" do
      ActionMailer::Base.deliveries.clear

      post "/api/v1/password/forgot",
           params: { email: "nadie@example.com" },
           headers: { "X-Tenant-Slug" => tenant.slug },
           as: :json

      expect(response).to have_http_status(:accepted)
      expect(ActionMailer::Base.deliveries.size).to eq(0)
    end

    it "400 si falta el tenant (header)" do
      post "/api/v1/password/forgot",
           params: { email: user.email },
           as: :json

      expect(response).to have_http_status(:bad_request)
    end
  end

  describe "POST /api/v1/password/reset" do
    it "restablece la contraseña con token válido" do
      with_tenant(tenant) { user.update_column(:refresh_token_jti, SecureRandom.uuid) }
      raw = Users::PasswordResetIssuer.new(user: user).call
      ActionMailer::Base.deliveries.clear

      post "/api/v1/password/reset",
           params: {
             reset_password_token: raw,
             password:             "Newsecret12",
             password_confirmation: "Newsecret12"
           },
           headers: { "X-Tenant-Slug" => tenant.slug },
           as: :json

      expect(response).to have_http_status(:no_content)
      expect(user.reload.valid_password?("Newsecret12")).to be(true)
      expect(user.refresh_token_jti).to be_nil
    end

    it "422 si el token es inválido" do
      post "/api/v1/password/reset",
           params: {
             reset_password_token: "invalid",
             password:             "Newsecret12",
             password_confirmation: "Newsecret12"
           },
           headers: { "X-Tenant-Slug" => tenant.slug },
           as: :json

      expect(response).to have_http_status(:unprocessable_content)
      json = response.parsed_body
      expect(json["error"]).to eq("invalid_token")
    end
  end

  describe "POST /api/v1/password/change" do
    let(:auth) do
      auth_headers(user, tenant: tenant).merge("X-Tenant-Slug" => tenant.slug)
    end

    before do
      with_tenant(tenant) { user.update_column(:refresh_token_jti, SecureRandom.uuid) }
    end

    it "cambia la contraseña e invalida el refresh token" do
      post "/api/v1/password/change",
           params: {
             user: {
               current_password:      "Oldsecret12",
               password:              "Newsecret12",
               password_confirmation: "Newsecret12"
             }
           },
           headers: auth,
           as: :json

      expect(response).to have_http_status(:no_content)
      expect(user.reload.valid_password?("Newsecret12")).to be(true)
      expect(user.refresh_token_jti).to be_nil
    end

    it "422 si la contraseña actual es incorrecta" do
      post "/api/v1/password/change",
           params: {
             user: {
               current_password:      "wrong",
               password:              "Newsecret12",
               password_confirmation: "Newsecret12"
             }
           },
           headers: auth,
           as: :json

      expect(response).to have_http_status(:unprocessable_content)
      expect(user.reload.refresh_token_jti).to be_present
    end
  end
end
