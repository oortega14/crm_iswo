# frozen_string_literal: true

require "rails_helper"

RSpec.describe ContactPolicy do
  let(:tenant) { ActsAsTenant.current_tenant }

  let(:admin)       { create(:user, :admin,      tenant: tenant) }
  let(:manager)     { create(:user, :manager,    tenant: tenant) }
  let(:consultant)  { create(:user, :consultant, tenant: tenant) }
  let(:viewer)      { create(:user, :viewer,     tenant: tenant) }

  let(:own_contact)     { create(:contact, tenant: tenant, owner_user: consultant) }
  let(:foreign_contact) { create(:contact, tenant: tenant, owner_user: admin) }

  describe "index?" do
    it "permitido para todo staff" do
      [admin, manager, consultant, viewer].each do |u|
        expect(described_class.new(u, Contact.new).index?).to be(true)
      end
    end
  end

  describe "show?" do
    it "admin, manager y viewer pueden ver cualquier contacto" do
      [admin, manager, viewer].each do |u|
        expect(described_class.new(u, foreign_contact).show?).to be(true)
      end
    end

    it "consultant puede ver contacto propio o con opp asignada" do
      expect(described_class.new(consultant, own_contact).show?).to be(true)

      pipeline = create(:pipeline_with_stages, tenant: tenant)
      shared = create(:contact, tenant: tenant)
      create(:opportunity,
             tenant: tenant,
             pipeline: pipeline,
             pipeline_stage: pipeline.pipeline_stages.first,
             contact: shared,
             owner_user: consultant)
      expect(described_class.new(consultant, shared).show?).to be(true)
    end

    it "consultant NO puede ver contacto ajeno sin opp" do
      expect(described_class.new(consultant, foreign_contact).show?).to be(false)
    end

    it "consultant puede ver contacto de opp de su red (solo lectura)" do
      referred = create(:user, :consultant, tenant: tenant)
      create(:referral_network, tenant: tenant, referrer_user: consultant, referred_user: referred)
      pipeline = create(:pipeline_with_stages, tenant: tenant)
      network_contact = create(:contact, tenant: tenant, owner_user: referred)
      create(:opportunity,
             tenant: tenant,
             pipeline: pipeline,
             pipeline_stage: pipeline.pipeline_stages.first,
             contact: network_contact,
             owner_user: referred)

      expect(described_class.new(consultant, network_contact).show?).to be(true)
      expect(described_class.new(consultant, network_contact).update?).to be(false)
    end
  end

  describe "create?" do
    it "admin, manager, consultant pueden crear" do
      [admin, manager, consultant].each do |u|
        expect(described_class.new(u, Contact.new).create?).to be(true)
      end
    end

    it "viewer no puede crear" do
      expect(described_class.new(viewer, Contact.new).create?).to be(false)
    end
  end

  describe "update?" do
    it "admin y manager siempre pueden" do
      expect(described_class.new(admin,   foreign_contact).update?).to be(true)
      expect(described_class.new(manager, foreign_contact).update?).to be(true)
    end

    it "consultant puede si es owner del contacto" do
      expect(described_class.new(consultant, own_contact).update?).to be(true)
    end

    it "consultant NO puede si el contacto no es suyo y no tiene opps" do
      expect(described_class.new(consultant, foreign_contact).update?).to be(false)
    end

    it "consultant puede si tiene una opp asignada sobre ese contacto" do
      pipeline = create(:pipeline_with_stages, tenant: tenant)
      create(:opportunity,
             tenant: tenant,
             pipeline: pipeline,
             pipeline_stage: pipeline.pipeline_stages.first,
             contact: foreign_contact,
             owner_user: consultant)
      expect(described_class.new(consultant, foreign_contact).update?).to be(true)
    end

    it "viewer nunca puede actualizar" do
      expect(described_class.new(viewer, foreign_contact).update?).to be(false)
    end
  end

  describe "destroy?" do
    it "solo admin" do
      expect(described_class.new(admin,      foreign_contact).destroy?).to be(true)
      expect(described_class.new(manager,    foreign_contact).destroy?).to be(false)
      expect(described_class.new(consultant, foreign_contact).destroy?).to be(false)
      expect(described_class.new(viewer,     foreign_contact).destroy?).to be(false)
    end
  end

  describe "check_duplicates?" do
    it "admin, manager, consultant" do
      expect(described_class.new(admin,      Contact.new).check_duplicates?).to be(true)
      expect(described_class.new(manager,    Contact.new).check_duplicates?).to be(true)
      expect(described_class.new(consultant, Contact.new).check_duplicates?).to be(true)
      expect(described_class.new(viewer,     Contact.new).check_duplicates?).to be(false)
    end
  end

  describe "export?" do
    it "solo admin y manager" do
      expect(described_class.new(admin,      Contact.new).export?).to be(true)
      expect(described_class.new(manager,    Contact.new).export?).to be(true)
      expect(described_class.new(consultant, Contact.new).export?).to be(false)
      expect(described_class.new(viewer,     Contact.new).export?).to be(false)
    end
  end

  describe "Scope#resolve" do
    before do
      own_contact
      foreign_contact
    end

    it "admin y manager ven todo" do
      expect(described_class::Scope.new(admin,   Contact).resolve).to match_array([own_contact, foreign_contact])
      expect(described_class::Scope.new(manager, Contact).resolve).to match_array([own_contact, foreign_contact])
    end

    it "viewer ve todo (solo lectura)" do
      expect(described_class::Scope.new(viewer, Contact).resolve).to match_array([own_contact, foreign_contact])
    end

    it "consultant ve los suyos o con opportunities suyas" do
      pipeline = create(:pipeline_with_stages, tenant: tenant)
      with_opp = create(:contact, tenant: tenant)
      create(:opportunity,
             tenant: tenant,
             pipeline: pipeline,
             pipeline_stage: pipeline.pipeline_stages.first,
             contact: with_opp,
             owner_user: consultant)

      expected = [own_contact, with_opp]
      expect(described_class::Scope.new(consultant, Contact).resolve).to match_array(expected)
    end

    it "scope.none si no hay usuario" do
      expect(described_class::Scope.new(nil, Contact).resolve).to be_empty
    end
  end
end
