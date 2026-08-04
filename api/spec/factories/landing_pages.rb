# frozen_string_literal: true

FactoryBot.define do
  factory :landing_page do
    tenant { Tenant.first || create(:tenant) }
    sequence(:title) { |n| "Landing #{n}" }
    sequence(:slug)  { |n| "landing-#{n}" }
    seo_title       { "Landing SEO" }
    seo_description { "Descripción SEO" }
    published { false }
    content   { {} }
    styles    { {} }
    view_count { 0 }
    lead_count { 0 }

    trait :approved do
      approval_status { "approved" }
      reviewed_at { Time.current }
    end

    trait :published do
      approval_status { "approved" }
      published { true }
      published_at { Time.current }
    end
  end
end
