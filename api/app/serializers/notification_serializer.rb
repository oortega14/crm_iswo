# frozen_string_literal: true

class NotificationSerializer < ApplicationSerializer
  set_type :notification

  attributes :kind, :title, :body, :resource_type, :read_at, :created_at

  attribute :resource_id do |n|
    n.resource_id&.to_s
  end

  attribute :unread do |n|
    n.read_at.nil?
  end
end
