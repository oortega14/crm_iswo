# frozen_string_literal: true

class ReferralNetworkSerializer < ApplicationSerializer
  set_type :referral_network

  attributes :depth, :commission_rate, :notes

  attribute :referrer do |r|
    next nil unless r.referrer_user

    {
      id:    r.referrer_user.id,
      name:  [r.referrer_user.first_name, r.referrer_user.last_name].compact.join(" "),
      email: r.referrer_user.email
    }
  end

  attribute :referred do |r|
    next nil unless r.referred_user

    {
      id:    r.referred_user.id,
      name:  [r.referred_user.first_name, r.referred_user.last_name].compact.join(" "),
      email: r.referred_user.email
    }
  end
end
