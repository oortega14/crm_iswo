# frozen_string_literal: true

class DuplicateFlagSerializer < ApplicationSerializer
  set_type :duplicate_flag

  attributes :matched_on, :match_score, :resolution, :resolution_note,
             :resolved_at, :resolved_by_user_id

  attribute :pending do |f|
    f.resolution == "pending"
  end

  belongs_to :tenant, serializer: :tenant

  attribute :contact_a do |f|
    f.contact_a&.then { |c| { id: c.id, full_name: [c.first_name, c.last_name].compact.join(" "), email: c.email, phone: c.phone_e164 } }
  end

  attribute :contact_b do |f|
    f.contact_b&.then { |c| { id: c.id, full_name: [c.first_name, c.last_name].compact.join(" "), email: c.email, phone: c.phone_e164 } }
  end

  attribute :opportunity_a_id
  attribute :opportunity_b_id
end
