# frozen_string_literal: true

# ============================================================================
# ReferralNetwork — relación de referencia entre consultores del mismo tenant
# ============================================================================
# Modelo adjacency list: un registro por par referrer→referred directo.
# Para árbol profundo, usar ReferralTreeQuery (WITH RECURSIVE) en services/.
# ============================================================================
class ReferralNetwork < ApplicationRecord
  include TenantScoped

  belongs_to :tenant
  belongs_to :referrer_user, class_name: "User"
  belongs_to :referred_user, class_name: "User"

  validates :depth, numericality: { only_integer: true, greater_than_or_equal_to: 1 }
  validates :referrer_user_id,
            uniqueness: { scope: %i[referred_user_id tenant_id],
                          message: "ya existe una referencia para este par" }
  validate  :not_self_referral
  validate  :same_tenant_users

  scope :active, -> { where(active: true) }

  private

  def not_self_referral
    errors.add(:referred_user_id, "no puede ser el mismo usuario") if referrer_user_id == referred_user_id
  end

  def same_tenant_users
    return unless referrer_user && referred_user

    unless referrer_user.tenant_id == referred_user.tenant_id && referrer_user.tenant_id == tenant_id
      errors.add(:base, "los usuarios deben pertenecer al mismo tenant")
    end
  end
end
