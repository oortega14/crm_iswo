# frozen_string_literal: true

# ============================================================================
# BantCriterion — pesos y umbral de calificación BANT por tenant
# ============================================================================
# Singleton por tenant. La suma de pesos debe ser exactamente 100.
# El servicio Opportunities::BantScorer aplica estos pesos al score crudo.
# ============================================================================
class BantCriterion < ApplicationRecord
  include TenantScoped

  belongs_to :tenant

  validates :tenant_id, uniqueness: true
  validates :budget_weight, :authority_weight, :need_weight, :timeline_weight,
            numericality: { only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: 100 }
  validates :threshold_qualified,
            numericality: { only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: 100 }
  validate  :weights_sum_to_100

  private

  def weights_sum_to_100
    sum = budget_weight.to_i + authority_weight.to_i + need_weight.to_i + timeline_weight.to_i
    errors.add(:base, "la suma de pesos BANT debe ser 100 (actual: #{sum})") unless sum == 100
  end
end
