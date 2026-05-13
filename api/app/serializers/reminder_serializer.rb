# frozen_string_literal: true

class ReminderSerializer < ApplicationSerializer
  set_type :reminder

  # Columnas reales: subject, message, last_error (no title/body/error_message/completed_at).
  attributes :subject, :message, :remind_at, :channel, :status, :sent_at, :last_error

  attribute :title do |r|
    r.subject
  end

  attribute :body do |r|
    r.message
  end

  attribute :completed_at do |r|
    r.status == "done" ? r.updated_at : nil
  end

  attribute :error_message do |r|
    r.last_error
  end

  attribute :overdue do |r|
    r.remind_at.present? && r.status_pending? && r.remind_at < Time.current
  end

  attribute :seconds_until do |r|
    next nil if r.remind_at.nil?

    (r.remind_at - Time.current).to_i
  end

  belongs_to :user, serializer: :user, record_type: :user
  belongs_to :opportunity, serializer: :opportunity_summary
end
