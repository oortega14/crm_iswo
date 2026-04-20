# frozen_string_literal: true

# ============================================================================
# Contact — persona o empresa prospecto
# ============================================================================
# `phone_normalized` se calcula con phonelib y se indexa con pg_trgm.
# El servicio Opportunities::DuplicateDetector consulta este modelo para
# encontrar coincidencias en tiempo real.
# ============================================================================
class Contact < ApplicationRecord
  include TenantScoped
  include Discard::Model

  KINDS = %w[person company].freeze
  enum :kind, KINDS.zip(KINDS).to_h, prefix: true

  # ---- Asociaciones ---------------------------------------------------------
  belongs_to :tenant
  belongs_to :owner_user, class_name: "User", optional: true

  has_many :opportunities, dependent: :destroy
  has_many :landing_form_submissions, dependent: :nullify
  has_many :whatsapp_messages, dependent: :nullify

  # ---- Validaciones ---------------------------------------------------------
  validates :kind, inclusion: { in: KINDS }
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }, allow_blank: true
  validate  :name_or_company_present
  validate  :valid_phone_format

  # ---- Callbacks ------------------------------------------------------------
  before_validation :normalize_email_and_phone

  # ---- Scopes ---------------------------------------------------------------
  scope :persons,   -> { where(kind: "person") }
  scope :companies, -> { where(kind: "company") }
  scope :with_phone, -> { where.not(phone_normalized: [nil, ""]) }

  # ---- Helpers --------------------------------------------------------------
  def display_name
    return company_name if kind_company?

    [first_name, last_name].compact.join(" ").presence || email
  end

  private

  def normalize_email_and_phone
    self.email = email&.downcase&.strip

    if phone_e164.present?
      parsed = Phonelib.parse(phone_e164, country)
      if parsed.valid?
        self.phone_e164       = parsed.e164
        self.phone_normalized = parsed.sanitized # solo dígitos
      end
    end
  end

  def name_or_company_present
    has_name = first_name.present? || last_name.present?
    has_company = company_name.present?
    errors.add(:base, "se requiere nombre o razón social") unless has_name || has_company
  end

  def valid_phone_format
    return if phone_e164.blank?

    errors.add(:phone_e164, "no es un teléfono válido") unless Phonelib.valid?(phone_e164)
  end
end
