# frozen_string_literal: true

# ============================================================================
# Tenant — raíz de la jerarquía multi-tenant
# ============================================================================
# Cada negocio o vertical (ISWO, Mi Casita, Libranzas, …) es una fila aquí.
# El subdominio se resuelve por `slug`.
# ============================================================================
class Tenant < ApplicationRecord
  include Discard::Model

  # ---- Asociaciones ---------------------------------------------------------
  has_many :users,                  dependent: :destroy
  has_many :pipelines,              dependent: :destroy
  has_many :pipeline_stages,        dependent: :destroy
  has_many :lead_sources,           dependent: :destroy
  has_many :contacts,               dependent: :destroy
  has_many :opportunities,          dependent: :destroy
  has_many :opportunity_logs,       dependent: :destroy
  has_many :reminders,              dependent: :destroy
  has_many :duplicate_flags,        dependent: :destroy
  has_many :referral_networks,      dependent: :destroy
  has_many :landing_pages,          dependent: :destroy
  has_many :landing_form_submissions, dependent: :destroy
  has_many :ad_integrations,        dependent: :destroy
  has_many :whatsapp_messages,      dependent: :destroy
  has_many :exports,                dependent: :destroy
  has_many :audit_events,           dependent: :nullify
  has_one  :bant_criterion,         dependent: :destroy

  # ---- Validaciones ---------------------------------------------------------
  validates :name,     presence: true
  validates :slug,     presence: true,
                       uniqueness: { case_sensitive: false },
                       format: { with: /\A[a-z0-9](?:[a-z0-9\-]{1,30}[a-z0-9])?\z/,
                                 message: "solo minúsculas, números y guiones" }
  validates :timezone, presence: true
  validates :locale,   presence: true
  validates :currency, presence: true, length: { is: 3 }

  # ---- Callbacks ------------------------------------------------------------
  before_validation :normalize_slug

  # ---- Scopes ---------------------------------------------------------------
  scope :active, -> { kept.where(active: true) }

  private

  def normalize_slug
    self.slug = slug&.downcase&.strip
  end
end
