# frozen_string_literal: true

require "rails_helper"

RSpec.describe Tenants::VerticalCatalog do
  describe ".resolve_slug" do
    it "normaliza alias mi_casita → micasita" do
      expect(described_class.resolve_slug("mi_casita")).to eq("micasita")
      expect(described_class.resolve_slug("mi-casita")).to eq("micasita")
    end
  end

  describe ".fetch" do
    it "devuelve configuración F5 para verticales conocidas" do
      iswo = described_class.fetch("iswo")
      expect(iswo.pipeline[:name]).to eq("Ciclo de Consultoría ISO")
      expect(iswo.stages.size).to eq(7)
      expect(iswo.bant[:authority_weight]).to eq(35)
    end

    it "devuelve nil para slug desconocido" do
      expect(described_class.fetch("clinica-nueva")).to be_nil
    end
  end
end
