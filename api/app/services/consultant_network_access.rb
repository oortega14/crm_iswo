# frozen_string_literal: true

# ============================================================================
# ConsultantNetworkAccess — visibilidad de la red de referidos (RFC §6.3 / F2)
# ============================================================================
# Consultor: oportunidades propias + las de referidos hasta network_depth.
# Admin/manager/viewer: todo el tenant. Edición en pipeline: solo propias (consultor).
# ============================================================================
module ConsultantNetworkAccess
  DEFAULT_NETWORK_DEPTH = 3
  MAX_NETWORK_DEPTH = 10

  module_function

  def network_depth(tenant)
    raw = tenant&.settings&.dig("network_depth")
    return DEFAULT_NETWORK_DEPTH if raw.nil?

    depth = raw.to_i
    depth.negative? ? 0 : depth
  end

  def tree_depth(tenant)
    [[network_depth(tenant), MAX_NETWORK_DEPTH].min, 0].max
  end

  # IDs de owner visibles en oportunidades, contactos, recordatorios, etc.
  def visible_owner_ids(user, tenant = nil)
    return [] unless user&.role == "consultant"

    tenant ||= ActsAsTenant.current_tenant || user.tenant
    [user.id] + descendant_consultant_ids(user, tenant)
  end

  def descendant_consultant_ids(user, tenant)
    depth_limit = network_depth(tenant)
    return [] if depth_limit <= 0

    tenant_id = tenant&.id || user.tenant_id
    ids = []
    frontier = [user.id]
    visited = Set.new(frontier)

    depth_limit.times do
      next_frontier = []
      ReferralNetwork.active
                     .where(tenant_id: tenant_id, referrer_user_id: frontier)
                     .pluck(:referred_user_id)
                     .each do |rid|
        next if visited.include?(rid)

        visited.add(rid)
        ids << rid
        next_frontier << rid
      end
      break if next_frontier.empty?

      frontier = next_frontier
    end

    ids
  end

  def from_network?(viewer, opportunity, tenant = nil)
    return false unless viewer && opportunity&.owner_user_id

    tenant ||= ActsAsTenant.current_tenant || viewer.tenant

    case viewer.role
    when "consultant"
      opportunity.owner_user_id != viewer.id &&
        descendant_consultant_ids(viewer, tenant).include?(opportunity.owner_user_id)
    when "admin", "manager", "viewer"
      ReferralNetwork.active.exists?(tenant_id: tenant.id, referred_user_id: opportunity.owner_user_id)
    else
      false
    end
  end

  def network_read_only?(viewer, opportunity, tenant = nil)
    viewer&.role == "consultant" && from_network?(viewer, opportunity, tenant)
  end

  def can_view_opportunity?(user, opportunity)
    return false unless user && opportunity
    return true if user.role.in?(%w[admin manager viewer])
    return false unless user.role == "consultant"

    visible_owner_ids(user).include?(opportunity.owner_user_id)
  end

  def can_edit_opportunity?(user, opportunity)
    return true if user.role.in?(%w[admin manager])
    return false unless user.role == "consultant"

    opportunity.owner_user_id == user.id
  end

  def can_view_contact?(user, contact)
    return false unless user && contact
    return true if user.role.in?(%w[admin manager viewer])
    return false unless user.role == "consultant"

    return true if contact.owner_user_id == user.id

    owner_ids = visible_owner_ids(user)
    contact.opportunities.where(owner_user_id: owner_ids).exists?
  end
end
