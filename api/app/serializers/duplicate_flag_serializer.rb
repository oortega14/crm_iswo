# frozen_string_literal: true

class DuplicateFlagSerializer < ApplicationSerializer
  set_type :duplicate_flag

  attributes :matched_on, :match_score, :resolution, :resolution_note,
             :resolved_at, :resolved_by_user_id

  attribute :pending do |f|
    f.resolution == "pending"
  end

  attribute :detected_by_name do |f|
    f.detected_by_user&.name
  end

  attribute :resolved_by_name do |f|
    f.resolved_by_user&.name
  end

  attribute :contact_a do |f|
    DuplicateFlagSerializer.contact_payload(f.contact_a)
  end

  attribute :contact_b do |f|
    DuplicateFlagSerializer.contact_payload(f.contact_b)
  end

  attribute :opportunity_a_id
  attribute :opportunity_b_id

  attribute :opportunity_a do |f|
    DuplicateFlagSerializer.opportunity_payload(f.opportunity)
  end

  attribute :opportunity_b do |f|
    DuplicateFlagSerializer.opportunity_payload(f.duplicate_of_opportunity)
  end

  def self.contact_payload(contact)
    return nil unless contact

    {
      id:        contact.id,
      full_name: contact.display_name,
      email:     contact.email,
      phone:     contact.phone_e164
    }
  end

  def self.opportunity_payload(opp)
    return nil unless opp

    {
      id:           opp.id,
      contact_name: opp.contact&.display_name.presence || opp.title,
      owner_id:     opp.owner_user_id,
      owner_name:   opp.owner_user&.name,
      created_at:   opp.created_at&.iso8601
    }
  end
end
