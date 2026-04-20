# frozen_string_literal: true

require "rails_helper"

RSpec.describe OpportunityPolicy do
  let(:tenant) { ActsAsTenant.current_tenant }

  let(:admin)      { create(:user, :admin,      tenant: tenant) }
  let(:manager)    { create(:user, :manager,    tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
  let(:other_consultant) { create(:user, :consultant, tenant: tenant) }
  let(:viewer)     { create(:user, :viewer,     tenant: tenant) }

  let(:pipeline) { create(:pipeline_with_stages, tenant: tenant) }
  let(:own_opp) do
    create(:opportunity,
           tenant: tenant,
           pipeline: pipeline,
           pipeline_stage: pipeline.pipeline_stages.first,
           owner_user: consultant)
  end
  let(:foreign_opp) do
    create(:opportunity,
           tenant: tenant,
           pipeline: pipeline,
           pipeline_stage: pipeline.pipeline_stages.first,
           owner_user: admin)
  end

  describe "show?" do
    it "admin/manager/viewer ven cualquier opp" do
      expect(described_class.new(admin,   foreign_opp).show?).to be(true)
      expect(described_class.new(manager, foreign_opp).show?).to be(true)
      expect(described_class.new(viewer,  foreign_opp).show?).to be(true)
    end

    it "consultant ve la suya" do
      expect(described_class.new(consultant, own_opp).show?).to be(true)
    end

    it "consultant NO ve opps ajenas" do
      expect(described_class.new(consultant, foreign_opp).show?).to be(false)
    end
  end

  describe "update?" do
    it "admin/manager siempre" do
      expect(described_class.new(admin,   foreign_opp).update?).to be(true)
      expect(described_class.new(manager, foreign_opp).update?).to be(true)
    end

    it "consultant solo las suyas" do
      expect(described_class.new(consultant,      own_opp).update?).to be(true)
      expect(described_class.new(other_consultant, own_opp).update?).to be(false)
    end

    it "viewer nunca" do
      expect(described_class.new(viewer, own_opp).update?).to be(false)
    end
  end

  describe "destroy?" do
    it "solo admin" do
      expect(described_class.new(admin,      foreign_opp).destroy?).to be(true)
      expect(described_class.new(manager,    foreign_opp).destroy?).to be(false)
      expect(described_class.new(consultant, own_opp).destroy?).to be(false)
    end
  end

  describe "acciones sensibles" do
    it "assign? y merge? solo admin/manager" do
      expect(described_class.new(admin,      foreign_opp).assign?).to be(true)
      expect(described_class.new(manager,    foreign_opp).assign?).to be(true)
      expect(described_class.new(consultant, own_opp).assign?).to be(false)

      expect(described_class.new(admin,      foreign_opp).merge?).to be(true)
      expect(described_class.new(consultant, own_opp).merge?).to be(false)
    end

    it "move_stage? y recalculate_bant? siguen update?" do
      expect(described_class.new(consultant, own_opp).move_stage?).to be(true)
      expect(described_class.new(consultant, foreign_opp).move_stage?).to be(false)
      expect(described_class.new(consultant, own_opp).recalculate_bant?).to be(true)
    end

    it "kanban? para todo staff" do
      [admin, manager, consultant, viewer].each do |u|
        expect(described_class.new(u, nil).kanban?).to be(true)
      end
    end

    it "export? solo admin/manager" do
      expect(described_class.new(admin,      nil).export?).to be(true)
      expect(described_class.new(manager,    nil).export?).to be(true)
      expect(described_class.new(consultant, nil).export?).to be(false)
      expect(described_class.new(viewer,     nil).export?).to be(false)
    end
  end

  describe "Scope#resolve" do
    before do
      own_opp
      foreign_opp
    end

    it "admin/manager ven todo" do
      expect(described_class::Scope.new(admin,   Opportunity).resolve).to match_array([own_opp, foreign_opp])
      expect(described_class::Scope.new(manager, Opportunity).resolve).to match_array([own_opp, foreign_opp])
    end

    it "viewer ve todo (read-only)" do
      expect(described_class::Scope.new(viewer, Opportunity).resolve).to match_array([own_opp, foreign_opp])
    end

    it "consultant solo las suyas" do
      expect(described_class::Scope.new(consultant, Opportunity).resolve).to match_array([own_opp])
    end

    it "scope.none sin usuario" do
      expect(described_class::Scope.new(nil, Opportunity).resolve).to be_empty
    end
  end
end
