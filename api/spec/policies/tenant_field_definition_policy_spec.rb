# frozen_string_literal: true

require "rails_helper"

RSpec.describe TenantFieldDefinitionPolicy do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:admin)      { create(:user, :admin,      tenant: tenant) }
  let(:manager)    { create(:user, :manager,    tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let(:viewer)     { create(:user, :viewer,     tenant: tenant) }
  let(:field)      { build(:tenant_field_definition, tenant: tenant) }

  %i[index? show?].each do |action|
    describe "#{action}" do
      it "permitido para todo el staff" do
        [admin, manager, consultant, viewer].each do |u|
          expect(described_class.new(u, field).public_send(action)).to be(true)
        end
      end
    end
  end

  %i[create? update? destroy?].each do |action|
    describe "#{action}" do
      it "solo admin" do
        expect(described_class.new(admin, field).public_send(action)).to be(true)
      end

      it "denegado para manager, consultant y viewer" do
        [manager, consultant, viewer].each do |u|
          expect(described_class.new(u, field).public_send(action)).to be(false)
        end
      end
    end
  end
end
