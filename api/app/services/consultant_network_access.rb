# frozen_string_literal: true

# ============================================================================
# ConsultantNetworkAccess — visibilidad de la red de referidos (RFC F2)
# ============================================================================
# Centraliza profundidad configurable y los owner_user_id visibles para un
# consultor (él mismo + referidos hasta N niveles).
# ============================================================================
module ConsultantNetworkAccess
  module_function

  # RFC §6.3: profundidad de red (solo referidos hacia abajo). 0 = solo oportunidades propias.
  def network_depth(tenant)
    raw = tenant&.settings&.dig("network_depth")
    return 3 if raw.nil?

    depth = raw.to_i
    depth.negative? ? 0 : depth
  end

  # Visibilidad de oportunidades para consultor (RFC §6.3 / F2).
  # Por defecto solo el propio owner; la red de referidos es opt-in por tenant.
  def opportunities_include_referral_network?(tenant)
    ActiveModel::Type::Boolean.new.cast(tenant&.settings&.dig("referral_opportunity_visibility"))
  end

  def visible_owner_ids(user)
    return [] unless user&.role == "consultant"

    ids = [user.id]
    tenant = user.tenant
    return ids unless opportunities_include_referral_network?(tenant)

    depth = network_depth(tenant)
    return ids if depth.zero?

    ids + user.network_user_ids(depth: depth)
  end

  def can_view_opportunity?(user, opportunity)
    return false unless user&.role == "consultant"
    return false unless opportunity.respond_to?(:owner_user_id)

    visible_owner_ids(user).include?(opportunity.owner_user_id)
  end

  def can_view_contact?(user, contact)
    return false unless user&.role == "consultant"
    return false unless contact

    return true if contact.owner_user_id == user.id

    contact.opportunities.where(owner_user_id: visible_owner_ids(user)).exists?
  end
end
