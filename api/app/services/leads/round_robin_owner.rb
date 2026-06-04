# frozen_string_literal: true

module Leads
  # Elige el consultor con menos oportunidades abiertas para asignar leads entrantes.
  module RoundRobinOwner
    OPEN_STATUSES = %w[new_lead contacted qualified proposal].freeze

    module_function

    def call(tenant)
      consultant = tenant.users.kept
                         .where(role: "consultant", active: true)
                         .left_joins(:owned_opportunities)
                         .where(
                           "opportunities.status IN (?) OR opportunities.id IS NULL",
                           OPEN_STATUSES
                         )
                         .group("users.id")
                         .order(Arel.sql("COUNT(opportunities.id) ASC"))
                         .first

      return consultant if consultant

      tenant.users.kept.where(role: "manager", active: true).order(:id).first ||
        tenant.users.kept.where(role: "consultant", active: true).order(:id).first ||
        tenant.users.kept.where(role: "admin", active: true).order(:id).first
    end
  end
end
