# frozen_string_literal: true

# ============================================================================
# ConsultantNetworkAccess — visibilidad de la red de referidos (RFC F2)
# ============================================================================
# Centraliza profundidad configurable y los owner_user_id visibles para un
# consultor (él mismo + referidos hasta N niveles hacia abajo).
# RFC §6.3: network_depth 0 = solo oportunidades propias; >0 incluye la red.
# ============================================================================
module ConsultantNetworkAccess
  DEFAULT_NETWORK_DEPTH = 3
  MAX_NETWORK_DEPTH = 10

  module_function

  # RFC §6.3: profundidad de red (solo referidos hacia abajo). 0 = solo oportunidades propias.
  def network_depth(tenant)
    raw = tenant&.settings&.dig("network_depth")
    return DEFAULT_NETWORK_DEPTH if raw.nil?

    depth = raw.to_i
    depth.negative? ? 0 : depth
  end

  # Profundidad para árbol API / badge (alineada con visibilidad, tope 10).
  def tree_depth(tenant)
    [[network_depth(tenant), MAX_NETWORK_DEPTH].min, 0].max
  end

  def visible_owner_ids(user)
    return [] unless user&.role == "consultant"

    ids = [user.id]
    depth = network_depth(user.tenant)
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
