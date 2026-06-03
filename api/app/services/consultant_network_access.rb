# frozen_string_literal: true

# ============================================================================
# ConsultantNetworkAccess — visibilidad de la red de referidos (RFC F2)
# ============================================================================
# Profundidad del árbol en /network (my_network, tree). El pipeline y contactos
# del consultor solo muestran registros propios (owner_user_id = consultor).
# ============================================================================
module ConsultantNetworkAccess
  DEFAULT_NETWORK_DEPTH = 3
  MAX_NETWORK_DEPTH = 10

  module_function

  # Profundidad del árbol de referidos (API /network). No amplía el pipeline CRM.
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

  # IDs de owner visibles en oportunidades, contactos, recordatorios, etc.
  def visible_owner_ids(user)
    return [] unless user&.role == "consultant"

    [user.id]
  end

  def can_view_opportunity?(user, opportunity)
    return false unless user&.role == "consultant"
    return false unless opportunity.respond_to?(:owner_user_id)

    opportunity.owner_user_id == user.id
  end

  def can_view_contact?(user, contact)
    return false unless user&.role == "consultant"
    return false unless contact

    return true if contact.owner_user_id == user.id

    contact.opportunities.where(owner_user_id: user.id).exists?
  end
end
