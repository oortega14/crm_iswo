# frozen_string_literal: true

class ExportSerializer < ApplicationSerializer
  set_type :export

  attributes :resource, :format, :status, :filters,
             :file_size, :file_url, :error_message,
             :started_at, :finished_at, :expires_at

  attribute :ready do |e|
    e.status == "ready" && (e.expires_at.nil? || e.expires_at > Time.current)
  end

  attribute :expired do |e|
    e.expires_at.present? && e.expires_at < Time.current
  end

  belongs_to :user, serializer: :user, record_type: :user
end
