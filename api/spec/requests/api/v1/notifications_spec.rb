# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Api::V1::Notifications", type: :request do
  let(:tenant) { ActsAsTenant.current_tenant }
  let(:user)   { create(:user, :consultant, tenant: tenant) }
  let!(:notif) { create(:notification, user: user, tenant: tenant, title: "Test notif") }
  let!(:read_notif) do
    create(:notification, user: user, tenant: tenant, title: "Ya leída", read_at: 1.hour.ago)
  end

  describe "GET /api/v1/notifications" do
    it "200 con lista de notificaciones del usuario" do
      get "/api/v1/notifications", headers: auth_headers(user)
      expect(response).to have_http_status(:ok)
      ids = json["data"].map { |d| d["id"].to_i }
      expect(ids).to include(notif.id, read_notif.id)
    end

    it "filtra solo no leídas con ?unread=true" do
      get "/api/v1/notifications?unread=true", headers: auth_headers(user)
      expect(response).to have_http_status(:ok)
      ids = json["data"].map { |d| d["id"].to_i }
      expect(ids).to include(notif.id)
      expect(ids).not_to include(read_notif.id)
    end

    it "no devuelve notificaciones de otro usuario" do
      other = create(:user, :consultant, tenant: tenant)
      other_notif = create(:notification, user: other, tenant: tenant, title: "Ajena")
      get "/api/v1/notifications", headers: auth_headers(user)
      ids = json["data"].map { |d| d["id"].to_i }
      expect(ids).not_to include(other_notif.id)
    end
  end

  describe "PATCH /api/v1/notifications/:id/read" do
    it "marca la notificación como leída" do
      patch "/api/v1/notifications/#{notif.id}/read", headers: auth_headers(user)
      expect(response).to have_http_status(:no_content)
      expect(notif.reload.read_at).not_to be_nil
    end

    it "no puede marcar notificación de otro usuario (scoped a current_user → 404)" do
      other = create(:user, :consultant, tenant: tenant)
      other_notif = create(:notification, user: other, tenant: tenant, title: "Ajena")
      patch "/api/v1/notifications/#{other_notif.id}/read", headers: auth_headers(user)
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/v1/notifications/read_all" do
    it "marca todas las notificaciones del usuario como leídas" do
      post "/api/v1/notifications/read_all", headers: auth_headers(user)
      expect(response).to have_http_status(:no_content)
      expect(notif.reload.read_at).not_to be_nil
    end
  end
end
