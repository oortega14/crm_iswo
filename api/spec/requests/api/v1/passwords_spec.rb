# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Passwords", :without_tenant, type: :request do
  # Sin el tenant por defecto del support: si no, acts_as_tenant asigna el User al tenant
  # equivocado y el API (X-Tenant-Slug: acme-co) no encuentra el correo ni el token.
  let(:tenant) { create(:tenant, slug: "acme-co") }
  let!(:admin) do
    with_tenant(tenant) do
      create(:user, :admin, tenant: tenant, email: "alice@example.com", password: "Oldsecret12")
    end
  end
  let!(:manager) do
    with_tenant(tenant) do
      create(:user, :manager, tenant: tenant, email: "manager@example.com", password: "Oldsecret12")
    end
  end
  let!(:consultant) do
    with_tenant(tenant) do
      create(:user, :consultant, tenant: tenant, email: "consultor@example.com", password: "Oldsecret12")
    end
  end

  describe "POST /api/v1/password/forgot" do
    it "responde 202 y envía correo cuando el usuario es admin del tenant" do
      expect do
        post "/api/v1/password/forgot",
             params: { email: admin.email },
             headers: { "X-Tenant-Slug" => tenant.slug },
             as: :json
      end.to change { ActionMailer::Base.deliveries.size }.by(1)

      expect(response).to have_http_status(:accepted)
      mail = ActionMailer::Base.deliveries.last
      expect(mail.to).to include(admin.email)
      body = mail.body.encoded
      expect(body).to include("reset-password")
      expect(body).to include(tenant.slug)
    end

    it "responde 202 y envía correo cuando el usuario es manager del tenant" do
      ActionMailer::Base.deliveries.clear

      expect do
        post "/api/v1/password/forgot",
             params: { email: manager.email },
             headers: { "X-Tenant-Slug" => tenant.slug },
             as: :json
      end.to change { ActionMailer::Base.deliveries.size }.by(1)

      expect(response).to have_http_status(:accepted)
    end

    it "responde 202 sin correo si el usuario existe pero es consultor" do
      ActionMailer::Base.deliveries.clear

      post "/api/v1/password/forgot",
           params: { email: consultant.email },
           headers: { "X-Tenant-Slug" => tenant.slug },
           as: :json

      expect(response).to have_http_status(:accepted)
      expect(ActionMailer::Base.deliveries.size).to eq(0)
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
           params: { email: admin.email },
           as: :json

      expect(response).to have_http_status(:bad_request)
    end
  end

  describe "POST /api/v1/password/reset" do
    it "restablece la contraseña con token válido (admin)" do
      with_tenant(tenant) { admin.update_column(:refresh_token_jti, SecureRandom.uuid) }
      raw = Users::PasswordResetIssuer.new(user: admin).call
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
      expect(admin.reload.valid_password?("Newsecret12")).to be(true)
      expect(admin.refresh_token_jti).to be_nil
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
      auth_headers(admin, tenant: tenant).merge("X-Tenant-Slug" => tenant.slug)
    end

    before do
      with_tenant(tenant) { admin.update_column(:refresh_token_jti, SecureRandom.uuid) }
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
      expect(admin.reload.valid_password?("Newsecret12")).to be(true)
      expect(admin.refresh_token_jti).to be_nil
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
      expect(admin.reload.refresh_token_jti).to be_present
    end

    it "permite al manager cambiar su contraseña" do
      with_tenant(tenant) { manager.update_column(:refresh_token_jti, SecureRandom.uuid) }
      mgr_auth = auth_headers(manager, tenant: tenant).merge("X-Tenant-Slug" => tenant.slug)

      post "/api/v1/password/change",
           params: {
             user: {
               current_password:      "Oldsecret12",
               password:              "Newsecret12",
               password_confirmation: "Newsecret12"
             }
           },
           headers: mgr_auth,
           as: :json

      expect(response).to have_http_status(:no_content)
      expect(manager.reload.valid_password?("Newsecret12")).to be(true)
    end

    it "403 si un consultor intenta cambiar su contraseña" do
      consult_auth = auth_headers(consultant, tenant: tenant).merge("X-Tenant-Slug" => tenant.slug)

      post "/api/v1/password/change",
           params: {
             user: {
               current_password:      "Oldsecret12",
               password:              "Newsecret12",
               password_confirmation: "Newsecret12"
             }
           },
           headers: consult_auth,
           as: :json

      expect(response).to have_http_status(:forbidden)
      expect(consultant.reload.valid_password?("Oldsecret12")).to be(true)
    end
  end
end
