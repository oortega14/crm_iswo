# frozen_string_literal: true

require "rails_helper"

RSpec.describe LogSanitizer do
  describe ".redact" do
    it "enmascara claves sensibles en hashes anidados" do
      input = {
        "email" => "a@b.co",
        "nested" => { "phone_e164" => "+573001234567", "title" => "Deal" }
      }

      result = described_class.redact(input)

      expect(result["email"]).to eq("[REDACTED]")
      expect(result.dig("nested", "phone_e164")).to eq("[REDACTED]")
      expect(result.dig("nested", "title")).to eq("Deal")
    end
  end
end
