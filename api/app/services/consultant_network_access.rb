# frozen_string_literal: true

# ============================================================================
# ConsultantNetworkAccess — visibilidad de la red de referidos (RFC F2)
# ============================================================================
# Centraliza profundidad configurable y los owner_user_id visibles para un
# consultor (él mismo + referidos hasta N niveles).
# ============================================================================
module ConsultantNetworkAccess
  module_function

  def network_depth(tenant)
    depth = tenant&.settings&.dig("network_depth").to_i
    depth < 1 ? 3 : depth
  end

  def visible_owner_ids(user)
    return [] unless user&.role == "consultant"

    [user.id] + user.network_user_ids(depth: network_depth(user.tenant))
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
