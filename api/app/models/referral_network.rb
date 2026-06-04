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
  validate  :no_referral_cycle, if: :referral_pair_changed?

  scope :active, -> { where(active: true) }

  # ¿Existe camino activo from → to siguiendo aristas referrer→referred?
  def self.path_exists?(tenant_id:, from_user_id:, to_user_id:, excluding_id: nil)
    return false if from_user_id == to_user_id

    visited = Set.new
    queue = [from_user_id]

    while queue.any?
      uid = queue.shift
      next if visited.include?(uid)

      return true if uid == to_user_id

      visited.add(uid)
      scope = active.where(tenant_id: tenant_id, referrer_user_id: uid)
      scope = scope.where.not(id: excluding_id) if excluding_id
      scope.pluck(:referred_user_id).each { |rid| queue << rid unless visited.include?(rid) }
    end

    false
  end

  private

  def referral_pair_changed?
    new_record? || will_save_change_to_referrer_user_id? || will_save_change_to_referred_user_id?
  end

  def no_referral_cycle
    return if referrer_user_id.blank? || referred_user_id.blank?

    if self.class.path_exists?(
      tenant_id: tenant_id,
      from_user_id: referred_user_id,
      to_user_id: referrer_user_id,
      excluding_id: id
    )
      errors.add(:base, "esta relación crearía un ciclo en la red de referidos")
    end
  end

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
