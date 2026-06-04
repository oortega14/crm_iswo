# frozen_string_literal: true

# Atributos/asociaciones permitidos para filtros de exportación (Ransack, RFC §6.7).
module ExportRansackable
  extend ActiveSupport::Concern

  class_methods do
    def ransackable_attributes(_auth_object = nil)
      self::EXPORT_RANSACKABLE_ATTRIBUTES
    end

    def ransackable_associations(_auth_object = nil)
      self::EXPORT_RANSACKABLE_ASSOCIATIONS
    end
  end
end
