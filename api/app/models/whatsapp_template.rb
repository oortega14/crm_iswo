# frozen_string_literal: true

# ============================================================================
# WhatsappTemplate — catálogo de plantillas aprobadas por Meta, por tenant
# ============================================================================
# Fuera de la ventana de servicio de 24h, WhatsApp exige una plantilla
# pre-aprobada para iniciar conversación (error 131047 en texto libre). Este
# catálogo evita que un consultor escriba a mano un `meta_template_name` con
# typos que Meta rechazaría.
# ============================================================================
class WhatsappTemplate < ApplicationRecord
  include TenantScoped

  belongs_to :tenant

  validates :name, :meta_template_name, :language, presence: true
  validates :meta_template_name,
            uniqueness: { scope: %i[tenant_id language], case_sensitive: false }

  scope :active, -> { where(active: true) }

  def variable_count
    Array(variable_labels).size
  end
end
