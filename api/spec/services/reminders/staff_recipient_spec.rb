# frozen_string_literal: true

require "rails_helper"

RSpec.describe Reminders::StaffRecipient do
  let(:tenant) { ActsAsTenant.current_tenant }

  describe ".eligible?" do
    it "acepta admin, manager y consultant" do
      expect(described_class.eligible?(create(:user, :admin, tenant: tenant))).to be(true)
      expect(described_class.eligible?(create(:user, :manager, tenant: tenant))).to be(true)
      expect(described_class.eligible?(create(:user, :consultant, tenant: tenant))).to be(true)
    end

    it "rechaza viewer y nil" do
      expect(described_class.eligible?(create(:user, :viewer, tenant: tenant))).to be(false)
      expect(described_class.eligible?(nil)).to be(false)
    end
  end

  describe ".phone_e164" do
    it "normaliza teléfono del usuario" do
      user = create(:user, :consultant, tenant: tenant, phone: "+57 300 111 2233")
      expect(described_class.phone_e164(user)).to eq("+573001112233")
    end

    it "devuelve nil si el teléfono es inválido o vacío" do
      user = create(:user, :consultant, tenant: tenant, phone: "abc")
      expect(described_class.phone_e164(user)).to be_nil
    end
  end
end
