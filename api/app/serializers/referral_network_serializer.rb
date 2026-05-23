# frozen_string_literal: true

class ReferralNetworkSerializer < ApplicationSerializer
  set_type :referral_network

  attributes :depth, :active, :commission_rate, :notes

  attribute :referrer do |r|
    next nil unless r.referrer_user

    {
      id:    r.referrer_user.id,
      name:  r.referrer_user.name,
      email: r.referrer_user.email
    }
  end

  attribute :referred do |r|
    next nil unless r.referred_user

    {
      id:    r.referred_user.id,
      name:  r.referred_user.name,
      email: r.referred_user.email
    }
  end
end
