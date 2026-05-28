# frozen_string_literal: true

# ============================================================================
# TenantFieldDefinition — campos extra configurables por tenant (F5 Verticales)
# ============================================================================
# Permite que cada vertical (Libranzas, Mi Casita, etc.) defina campos
# propios sin modificar el esquema central.
# Los valores se guardan en custom_fields (JSONB) de opportunities / contacts.
#
# field_type: text | number | select | date | boolean | currency
# entity:     opportunity | contact
# ============================================================================
class TenantFieldDefinition < ApplicationRecord
  include TenantScoped

  FIELD_TYPES = %w[text number select date boolean currency].freeze
  ENTITIES    = %w[opportunity contact].freeze

  belongs_to :tenant

  validates :key,        presence: true,
                         format: { with: /\A[a-z][a-z0-9_]*\z/,
                                   message: "solo minúsculas, números y guion bajo" }
  validates :label,      presence: true
  validates :field_type, inclusion: { in: FIELD_TYPES }
  validates :entity,     inclusion: { in: ENTITIES }
  validates :key, uniqueness: { scope: %i[tenant_id entity],
                                message: "ya existe para esta entidad en este tenant" }

  scope :active,     -> { where(active: true) }
  scope :for_entity, ->(e) { where(entity: e) }
  scope :ordered,    -> { order(:position, :created_at) }
end
