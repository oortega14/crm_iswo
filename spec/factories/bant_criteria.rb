# frozen_string_literal: true

FactoryBot.define do
  factory :bant_criterion do
    tenant { Tenant.first || create(:tenant) }
    budget_weight    { 25 }
    authority_weight { 25 }
    need_weight      { 25 }
    timeline_weight  { 25 }
    threshold_qualified { 60 }
    active           { true }
  end
end
