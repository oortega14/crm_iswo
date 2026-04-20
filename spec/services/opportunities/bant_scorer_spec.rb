# frozen_string_literal: true

require "rails_helper"

RSpec.describe Opportunities::BantScorer do
  let(:tenant) { ActsAsTenant.current_tenant }
  let!(:criterion) do
    create(:bant_criterion,
           tenant: tenant,
           budget_weight: 40, authority_weight: 20, need_weight: 20, timeline_weight: 20)
  end
  let(:opportunity) do
    create(:opportunity, tenant: tenant, estimated_value: 5_000_000, bant_data: bant_data)
  end

  describe "#call" do
    context "sin bant_data" do
      let(:bant_data) { {} }

      it "asume 50 por dimensión y pondera" do
        result = described_class.new(opportunity).call
        expect(result[:breakdown]).to eq(budget: 60, authority: 50, need: 50, timeline: 50)
        # 60*40 + 50*20 + 50*20 + 50*20 = 5400 → 54
        expect(result[:score]).to eq(54)
      end
    end

    context "con scores directos" do
      let(:bant_data) do
        {
          "budget"    => { "score" => 90 },
          "authority" => { "score" => 100 },
          "need"      => { "score" => 80 },
          "timeline"  => { "score" => 70 }
        }
      end

      it "usa los scores tal cual y aplica pesos" do
        result = described_class.new(opportunity).call
        expect(result[:breakdown]).to eq(budget: 90, authority: 100, need: 80, timeline: 70)
        # 90*40 + 100*20 + 80*20 + 70*20 = 3600 + 2000 + 1600 + 1400 = 8600 → 86
        expect(result[:score]).to eq(86)
      end
    end

    context "con respuestas cualitativas" do
      let(:bant_data) do
        {
          "budget"    => { "amount" => 20_000_000 },   # → 80
          "authority" => { "role"   => "gerente"    }, # → 90
          "need"      => { "intent" => "urgente"    }, # → 95
          "timeline"  => { "days"   => 5            }  # → 95
        }
      end

      it "traduce respuestas a puntajes" do
        result = described_class.new(opportunity).call
        expect(result[:breakdown]).to eq(budget: 80, authority: 90, need: 95, timeline: 95)
      end
    end

    context "timeline fuera de rangos" do
      let(:bant_data) { { "timeline" => { "days" => 365 } } }

      it "penaliza cierres muy lejanos" do
        result = described_class.new(opportunity).call
        expect(result[:breakdown][:timeline]).to eq(15)
      end
    end
  end

  describe "#call_and_persist!" do
    let(:bant_data) { { "budget" => { "score" => 100 } } }

    it "actualiza bant_score y guarda breakdown en bant_data" do
      described_class.new(opportunity).call_and_persist!
      opportunity.reload
      expect(opportunity.bant_score).to be_between(0, 100)
      expect(opportunity.bant_data["breakdown"]).to include("budget" => 100)
    end
  end

  describe "fallback sin BantCriterion" do
    before { criterion.destroy }

    let(:bant_data) { {} }

    it "usa pesos 25/25/25/25 como default" do
      result = described_class.new(opportunity).call
      # Sin data: budget=60 (estimated_value 5M → rango 1M..10M), resto=50.
      # 60*25 + 50*25*3 = 1500 + 3750 = 5250 → 53
      expect(result[:score]).to eq(53)
    end
  end
end
