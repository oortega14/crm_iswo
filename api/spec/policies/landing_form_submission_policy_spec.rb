# frozen_string_literal: true

require "rails_helper"

RSpec.describe LandingFormSubmissionPolicy do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:landing)    { create(:landing_page, tenant: tenant) }
  let(:submission) { create(:landing_form_submission, tenant: tenant, landing_page: landing) }
  let(:admin)      { create(:user, :admin,      tenant: tenant) }
  let(:manager)    { create(:user, :manager,    tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let(:viewer)     { create(:user, :viewer,     tenant: tenant) }

  describe "index? / show?" do
    it "permite a todo el staff" do
      [admin, manager, consultant, viewer].each do |u|
        expect(described_class.new(u, submission).index?).to be(true)
        expect(described_class.new(u, submission).show?).to  be(true)
      end
    end
  end

  describe "create? / update?" do
    it "nadie puede crear ni modificar submissions desde el panel (creación solo vía endpoint público)" do
      [admin, manager, consultant, viewer].each do |u|
        expect(described_class.new(u, submission).create?).to be(false)
        expect(described_class.new(u, submission).update?).to be(false)
      end
    end
  end

  describe "destroy?" do
    it "solo admin" do
      expect(described_class.new(admin,      submission).destroy?).to be(true)
      expect(described_class.new(manager,    submission).destroy?).to be(false)
      expect(described_class.new(consultant, submission).destroy?).to be(false)
    end
  end
end
