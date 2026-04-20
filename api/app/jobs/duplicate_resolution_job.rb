# frozen_string_literal: true

# ============================================================================
# DuplicateResolutionJob — aplica la resolución elegida desde la UI.
# ============================================================================
# Se invoca desde DuplicateFlagsController#merge / #reassign / #ignore.
# Hace el trabajo pesado en background para no bloquear la request del SPA.
#
# action ∈ { "merge", "reassign", "ignore" }
#   merge:   llama a Opportunities::Merger entre opportunity_a y opportunity_b.
#   reassign: cambia owner_user_id de la opp B al owner de A.
#   ignore:   marca el flag como resolved="ignored".
# ============================================================================
class DuplicateResolutionJob < ApplicationJob
  queue_as :default

  def perform(flag_id, action, performed_by_id = nil)
    flag = DuplicateFlag.find_by(id: flag_id)
    return unless flag

    ActsAsTenant.with_tenant(flag.tenant) do
      user = performed_by_id ? User.find_by(id: performed_by_id) : nil
      case action
      when "merge"    then handle_merge(flag, user)
      when "reassign" then handle_reassign(flag, user)
      when "ignore"   then handle_ignore(flag, user)
      else raise "DuplicateResolutionJob: action desconocida #{action}"
      end
    end
  end

  private

  def handle_merge(flag, user)
    target = Opportunity.find_by(id: flag.opportunity_a_id)
    source = Opportunity.find_by(id: flag.opportunity_b_id)
    return mark_resolved!(flag, "skipped", user, "no_opportunities") unless target && source

    Opportunities::Merger.new(source: source, target: target, performed_by: user).call
    mark_resolved!(flag, "merged", user)
  end

  def handle_reassign(flag, user)
    a = Opportunity.find_by(id: flag.opportunity_a_id)
    b = Opportunity.find_by(id: flag.opportunity_b_id)
    return mark_resolved!(flag, "skipped", user, "no_opportunities") unless a && b

    b.update!(owner_user_id: a.owner_user_id) if a.owner_user_id.present?
    mark_resolved!(flag, "reassigned", user)
  end

  def handle_ignore(flag, user)
    mark_resolved!(flag, "ignored", user)
  end

  def mark_resolved!(flag, resolution, user, note = nil)
    flag.update!(
      resolution:          resolution,
      resolved_at:         Time.current,
      resolved_by_user_id: user&.id,
      resolution_note:     note
    )
  end
end
