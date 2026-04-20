# frozen_string_literal: true

class ReminderSerializer < ApplicationSerializer
  set_type :reminder

  attributes :title, :body, :remind_at, :channel, :status,
             :sent_at, :completed_at, :error_message

  attribute :overdue do |r|
    r.status == "pending" && r.remind_at < Time.current
  end

  attribute :seconds_until do |r|
    next nil if r.remind_at.nil?

    (r.remind_at - Time.current).to_i
  end

  belongs_to :user,        serializer: :user, record_type: :user
  belongs_to :opportunity, serializer: :opportunity
end
