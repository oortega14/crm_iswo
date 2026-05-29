# frozen_string_literal: true

namespace :opportunities do
  desc "Recalcula temperatura (cold/warm/hot) de oportunidades abiertas según BANT y actividad"
  task backfill_temperatures: :environment do
    unless defined?(Opportunities::TemperatureCalculator)
      puts "TemperatureCalculator no disponible"
      next
    end

    updated = 0
    Opportunity.kept.where.not(status: %w[won lost merged]).find_each do |opp|
      ActsAsTenant.with_tenant(opp.tenant) do
        before = opp.temperature
        Opportunities::TemperatureCalculator.new(opp).apply!
        updated += 1 if opp.reload.temperature != before
      end
    end
    puts "Temperaturas recalculadas: #{updated} oportunidades actualizadas"
  end
end
