# frozen_string_literal: true

class ExportSerializer < ApplicationSerializer
  set_type :export

  attributes :resource, :format, :status, :filters,
             :error_message, :expires_at, :user_id

  # Siempre apunta al endpoint autenticado; el backend decide si redirige a S3
  # o sirve el archivo desde storage/ según dónde esté guardado.
  attribute :file_url do |e|
    "/api/v1/exports/#{e.id}/download" if e.status == "succeeded"
  end

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
