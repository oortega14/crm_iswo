# frozen_string_literal: true

class BantCriterionSerializer < ApplicationSerializer
  set_type :bant_criterion

  attributes :budget_weight, :authority_weight, :need_weight, :timeline_weight,
             :description, :active

  attribute :weights_total do |c|
    c.budget_weight.to_f + c.authority_weight.to_f + c.need_weight.to_f + c.timeline_weight.to_f
  end
end
