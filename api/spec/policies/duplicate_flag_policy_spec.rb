# frozen_string_literal: true

require "rails_helper"

RSpec.describe DuplicateFlagPolicy do
  let(:tenant)     { ActsAsTenant.current_tenant }
  let(:pipeline)   { create(:pipeline_with_stages, tenant: tenant) }
  let(:contact)    { create(:contact, tenant: tenant) }
  let(:opp)        { create(:opportunity, tenant: tenant, contact: contact, pipeline: pipeline, pipeline_stage: pipeline.pipeline_stages.first) }
  let(:flag)       { create(:duplicate_flag, tenant: tenant, opportunity: opp) }
  let(:admin)      { create(:user, :admin,      tenant: tenant) }
  let(:manager)    { create(:user, :manager,    tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let(:other)      { create(:user, :consultant, tenant: tenant) }
  let(:viewer)     { create(:user, :viewer,     tenant: tenant) }

  describe "index?" do
    it "permite a todo el staff" do
      [admin, manager, consultant, viewer].each do |u|
        expect(described_class.new(u, flag).index?).to be(true)
      end
    end
  end

  describe "show?" do
    it "permite a admin, manager y viewer en cualquier flag" do
      [admin, manager, viewer].each do |u|
        expect(described_class.new(u, flag).show?).to be(true)
      end
    end

    it "consultor solo si participa en el flag" do
      involved = create(:duplicate_flag, tenant: tenant, detected_by_user: consultant)
      foreign  = create(:duplicate_flag, tenant: tenant, detected_by_user: other)

      expect(described_class.new(consultant, involved).show?).to be(true)
      expect(described_class.new(consultant, foreign).show?).to  be(false)
    end

    it "consultor ve flag si es dueño de opportunity o duplicate_of_opportunity" do
      opp_owned = create(:opportunity, tenant: tenant, contact: contact, pipeline: pipeline,
                         pipeline_stage: pipeline.pipeline_stages.first, owner_user: consultant)
      flag_owned = create(:duplicate_flag, tenant: tenant, opportunity: opp_owned, detected_by_user: other)

      expect(described_class.new(consultant, flag_owned).show?).to be(true)
    end
  end

  describe "create? / update? / reassign? / merge? / ignore?" do
    it "permite a admin y manager" do
      expect(described_class.new(admin,   flag).create?).to   be(true)
      expect(described_class.new(manager, flag).create?).to   be(true)
      expect(described_class.new(admin,   flag).reassign?).to be(true)
      expect(described_class.new(manager, flag).merge?).to    be(true)
      expect(described_class.new(admin,   flag).ignore?).to   be(true)
    end

    it "deniega a consultant y viewer" do
      expect(described_class.new(consultant, flag).update?).to   be(false)
      expect(described_class.new(viewer,     flag).reassign?).to be(false)
      expect(described_class.new(consultant, flag).merge?).to    be(false)
    end
  end

  describe "destroy?" do
    it "solo admin" do
      expect(described_class.new(admin,      flag).destroy?).to be(true)
      expect(described_class.new(manager,    flag).destroy?).to be(false)
      expect(described_class.new(consultant, flag).destroy?).to be(false)
    end
  end

  describe "Scope#resolve" do
    let!(:manager_flag)    { create(:duplicate_flag, tenant: tenant, detected_by_user: manager) }
    let!(:consultant_flag) { create(:duplicate_flag, tenant: tenant, detected_by_user: consultant) }

    it "admin, manager y viewer ven todo" do
      [admin, manager, viewer].each do |u|
        ids = described_class::Scope.new(u, DuplicateFlag).resolve.pluck(:id)
        expect(ids).to include(manager_flag.id, consultant_flag.id)
      end
    end

    it "consultor solo flags donde participa" do
      ids = described_class::Scope.new(consultant, DuplicateFlag).resolve.pluck(:id)
      expect(ids).to include(consultant_flag.id)
      expect(ids).not_to include(manager_flag.id)
    end

    it "scope.none sin usuario" do
      expect(described_class::Scope.new(nil, DuplicateFlag).resolve).to be_empty
    end
  end
end
