# frozen_string_literal: true

FactoryBot.define do
  factory :tenant_field_definition do
    tenant    { Tenant.first || create(:tenant) }
    sequence(:key) { |n| "campo_#{n}" }
    label     { "Campo de prueba" }
    field_type { "text" }
    entity    { "opportunity" }
    required  { false }
    active    { true }
    position  { 0 }
    options   { [] }

    trait :select do
      field_type { "select" }
      options    { ["Opción A", "Opción B", "Opción C"] }
    end

    trait :number   do field_type { "number" }   end
    trait :boolean  do field_type { "boolean" }  end
    trait :date     do field_type { "date" }     end
    trait :currency do field_type { "currency" } end
    trait :required do required { true } end
    trait :inactive do active { false } end
    trait :for_contact do entity { "contact" } end
  end
end
