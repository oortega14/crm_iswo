# frozen_string_literal: true

# ============================================================================
# User — consultor o administrador dentro de un tenant
# ============================================================================
# Devise + JWT (devise-jwt). Email único por tenant (no global).
# Roles: admin, manager, consultant (default), viewer.
# ============================================================================
class User < ApplicationRecord
  include TenantScoped
  include Discard::Model

  # ---- Devise ---------------------------------------------------------------
  devise :database_authenticatable,
         :registerable,
         :recoverable,
         :rememberable,
         :trackable,
         :lockable,
         :confirmable,
         :jwt_authenticatable,
         jwt_revocation_strategy: JwtDenylist

  # ---- Enums ----------------------------------------------------------------
  ROLES = %w[admin manager consultant viewer].freeze
  enum :role, ROLES.zip(ROLES).to_h, prefix: true, default: "consultant"

  # ---- Asociaciones ---------------------------------------------------------
  belongs_to :tenant

  has_many :owned_contacts,       class_name: "Contact",     foreign_key: :owner_user_id, dependent: :nullify
  has_many :owned_opportunities,  class_name: "Opportunity", foreign_key: :owner_user_id, dependent: :nullify
  has_many :reminders,            dependent: :destroy
  has_many :opportunity_logs,     dependent: :nullify
  has_many :exports,              dependent: :nullify

  # Red de referidos (self-referential many-to-many)
  has_many :outgoing_referrals,
           class_name: "ReferralNetwork",
           foreign_key: :referrer_user_id,
           dependent: :destroy
  has_many :incoming_referrals,
           class_name: "ReferralNetwork",
           foreign_key: :referred_user_id,
           dependent: :destroy
  has_many :referred_users, through: :outgoing_referrals, source: :referred_user
  has_many :referrers,      through: :incoming_referrals, source: :referrer_user

  # Duplicate flags
  has_many :detected_duplicates,
           class_name: "DuplicateFlag",
           foreign_key: :detected_by_user_id,
           dependent: :nullify
  has_many :resolved_duplicates,
           class_name: "DuplicateFlag",
           foreign_key: :resolved_by_user_id,
           dependent: :nullify

  # ---- Validaciones ---------------------------------------------------------
  validates :email,
            presence: true,
            format: { with: URI::MailTo::EMAIL_REGEXP },
            uniqueness: { scope: :tenant_id, case_sensitive: false }
  validates :name, presence: true
  validates :role, inclusion: { in: ROLES }
  validates :password, length: { minimum: 8 }, allow_nil: true

  # ---- Callbacks ------------------------------------------------------------
  before_validation :normalize_email

  # ---- Scopes ---------------------------------------------------------------
  scope :active,   -> { kept.where(active: true) }
  scope :by_role,  ->(role) { where(role: role) }

  # ---- Métodos --------------------------------------------------------------
  def staff?
    role_admin? || role_manager?
  end

  def can_export?
    role_admin? || role_manager?
  end

  private

  def normalize_email
    self.email = email&.downcase&.strip
  end
end
