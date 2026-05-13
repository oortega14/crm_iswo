# frozen_string_literal: true

class ExportSerializer < ApplicationSerializer
  set_type :export

  attributes :resource, :format, :status, :filters,
             :file_url, :error_message, :expires_at, :user_id

  # Columnas opcionales si la migración aún no está aplicada en una BD antigua.
  attribute :file_size do |e|
    e.try(:file_size)
  end

  attribute :started_at do |e|
    e.try(:started_at)
  end

  attribute :finished_at do |e|
    e.try(:finished_at)
  end

  attribute :ready do |e|
    e.status == "succeeded" && (e.expires_at.nil? || e.expires_at > Time.current)
  end

  attribute :expired do |e|
    e.expires_at.present? && e.expires_at < Time.current
  end
end
