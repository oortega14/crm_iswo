# frozen_string_literal: true

# Clasifica temperatura en background tras editar dossier del lead (auto-save).
class OpportunityTemperatureClassifyJob < ApplicationJob
  queue_as :default

  def perform(
    opportunity_id,
    tenant_id:,
    user_id: nil,
    source: "auto_save",
    ip_address: nil,
    user_agent: nil
  )
    tenant = Tenant.find_by(id: tenant_id)
    return unless tenant

    ActsAsTenant.with_tenant(tenant) do
      opp = Opportunity.kept.find_by(id: opportunity_id)
      return unless opp

      user = user_id ? User.find_by(id: user_id) : nil
      Opportunities::TemperatureAutoClassifier.new(
        opp,
        source:      source,
        user:        user,
        ip_address:  ip_address,
        user_agent:  user_agent
      ).call
    end
  end
end
