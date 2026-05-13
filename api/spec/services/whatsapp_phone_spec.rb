# frozen_string_literal: true

require "rails_helper"

RSpec.describe WhatsappPhone do
  describe ".normalize_to_e164" do
    it "limpia whatsapp:" do
      expect(described_class.normalize_to_e164("whatsapp:+573001112233")).to eq("+573001112233")
    end

    it "añade +57 a móvil CO de 10 dígitos si falta país" do
      expect(described_class.normalize_to_e164("3001112233")).to eq("+573001112233")
    end

    it "respeta número ya internacional válido" do
      expect(described_class.normalize_to_e164("+573001112233")).to eq("+573001112233")
    end
  end
end
