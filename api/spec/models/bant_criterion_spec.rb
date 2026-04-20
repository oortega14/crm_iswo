# frozen_string_literal: true

require "rails_helper"

RSpec.describe BantCriterion, type: :model do
  let(:tenant) { ActsAsTenant.current_tenant }
  subject { build(:bant_criterion, tenant: tenant) }

  describe "asociaciones" do
    it { is_expected.to belong_to(:tenant) }
  end

  describe "validaciones" do
    %i[budget_weight authority_weight need_weight timeline_weight threshold_qualified].each do |attr|
      it { is_expected.to validate_numericality_of(attr).only_integer.is_greater_than_or_equal_to(0).is_less_than_or_equal_to(100) }
    end

    it "rechaza un segundo BantCriterion para el mismo tenant" do
      create(:bant_criterion, tenant: tenant)
      duplicate = build(:bant_criterion, tenant: tenant)
      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:tenant_id]).to be_present
    end

    it "rechaza si la suma de pesos no es 100" do
      bad = build(:bant_criterion, tenant: tenant,
                                    budget_weight: 20,
                                    authority_weight: 20,
                                    need_weight: 20,
                                    timeline_weight: 20)
      expect(bad).not_to be_valid
      expect(bad.errors[:base].join).to match(/suma de pesos BANT/)
    end

    it "acepta si la suma de pesos es exactamente 100" do
      good = build(:bant_criterion, tenant: tenant,
                                    budget_weight: 25,
                                    authority_weight: 25,
                                    need_weight: 25,
                                    timeline_weight: 25)
      expect(good).to be_valid
    end

    it "acepta distribuciones asimétricas que sumen 100" do
      asym = build(:bant_criterion, tenant: tenant,
                                    budget_weight: 40,
                                    authority_weight: 20,
                                    need_weight: 30,
                                    timeline_weight: 10)
      expect(asym).to be_valid
    end
  end
end
