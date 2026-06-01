# frozen_string_literal: true

require "rails_helper"

RSpec.describe NotificationPolicy do
  let(:tenant)  { ActsAsTenant.current_tenant }
  let(:user)    { create(:user, :consultant, tenant: tenant) }
  let(:other)   { create(:user, :consultant, tenant: tenant) }

  let(:own_notification)   { Notification.new(user: user, tenant: tenant) }
  let(:other_notification) { Notification.new(user: other, tenant: tenant) }

  describe "index?" do
    it "permite a cualquier usuario autenticado" do
      expect(described_class.new(user, nil).index?).to be(true)
    end
  end

  describe "update? (marcar como leída)" do
    it "permite al dueño de la notificación" do
      expect(described_class.new(user, own_notification).update?).to be(true)
    end

    it "deniega a otro usuario" do
      expect(described_class.new(other, own_notification).update?).to be(false)
    end
  end

  describe "Scope#resolve" do
    let!(:mine)  { create(:notification, user: user, tenant: tenant) }
    let!(:theirs) { create(:notification, user: other, tenant: tenant) }

    it "devuelve solo las notificaciones del usuario" do
      scope = described_class::Scope.new(user, Notification).resolve
      expect(scope).to include(mine)
      expect(scope).not_to include(theirs)
    end
  end
end
