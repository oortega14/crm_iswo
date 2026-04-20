# frozen_string_literal: true

require "rails_helper"

RSpec.describe ReminderPolicy do
  let(:tenant) { ActsAsTenant.current_tenant }

  let(:admin)      { create(:user, :admin,      tenant: tenant) }
  let(:manager)    { create(:user, :manager,    tenant: tenant) }
  let(:consultant) { create(:user, :consultant, tenant: tenant) }
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

  let(:own_reminder)     { create(:reminder, tenant: tenant, user: consultant, opportunity: own_opp) }
  let(:foreign_reminder) { create(:reminder, tenant: tenant, user: admin,      opportunity: foreign_opp) }

  describe "show?" do
    it "admin/manager/viewer ven todo" do
      expect(described_class.new(admin,   foreign_reminder).show?).to be(true)
      expect(described_class.new(manager, foreign_reminder).show?).to be(true)
      expect(described_class.new(viewer,  foreign_reminder).show?).to be(true)
    end

    it "consultant ve los suyos" do
      expect(described_class.new(consultant, own_reminder).show?).to be(true)
    end

    it "consultant NO ve los ajenos" do
      expect(described_class.new(consultant, foreign_reminder).show?).to be(false)
    end
  end

  describe "update? y destroy?" do
    it "admin/manager pueden siempre" do
      expect(described_class.new(admin,   foreign_reminder).update?).to be(true)
      expect(described_class.new(manager, foreign_reminder).destroy?).to be(true)
    end

    it "consultant puede sobre los suyos" do
      expect(described_class.new(consultant, own_reminder).update?).to be(true)
      expect(described_class.new(consultant, own_reminder).destroy?).to be(true)
    end

    it "consultant NO puede sobre ajenos" do
      expect(described_class.new(consultant, foreign_reminder).update?).to be(false)
      expect(described_class.new(consultant, foreign_reminder).destroy?).to be(false)
    end

    it "viewer no puede" do
      expect(described_class.new(viewer, own_reminder).update?).to be(false)
      expect(described_class.new(viewer, own_reminder).destroy?).to be(false)
    end
  end

  describe "complete? y snooze?" do
    it "reflejan update?" do
      expect(described_class.new(consultant, own_reminder).complete?).to be(true)
      expect(described_class.new(consultant, foreign_reminder).snooze?).to be(false)
    end
  end

  describe "Scope#resolve" do
    before do
      own_reminder
      foreign_reminder
    end

    it "admin/manager ven todo" do
      expect(described_class::Scope.new(admin,   Reminder).resolve).to match_array([own_reminder, foreign_reminder])
      expect(described_class::Scope.new(manager, Reminder).resolve).to match_array([own_reminder, foreign_reminder])
    end

    it "viewer ve todo (read-only)" do
      expect(described_class::Scope.new(viewer, Reminder).resolve).to match_array([own_reminder, foreign_reminder])
    end

    it "consultant ve los propios o ligados a sus opps" do
      opp_reminder = create(:reminder, tenant: tenant, user: admin, opportunity: own_opp)
      expected = [own_reminder, opp_reminder]
      expect(described_class::Scope.new(consultant, Reminder).resolve).to match_array(expected)
    end

    it "scope.none sin usuario" do
      expect(described_class::Scope.new(nil, Reminder).resolve).to be_empty
    end
  end
end
