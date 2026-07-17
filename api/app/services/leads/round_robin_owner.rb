# frozen_string_literal: true

module Leads
  # Elige el consultor con menos oportunidades abiertas para asignar leads entrantes.
  module RoundRobinOwner
    OPEN_STATUSES = %w[new_lead contacted qualified proposal].freeze

    module_function

    def call(tenant)
      # La condición de "abierta" va en el ON del LEFT JOIN (no en el WHERE):
      # así un consultor con solo oportunidades cerradas (won/lost) cuenta 0
      # abiertas y sigue elegible, en vez de desaparecer del GROUP BY y quedar
      # excluido para siempre del reparto.
      open_join = ActiveRecord::Base.sanitize_sql_array(
        ["LEFT JOIN opportunities ON opportunities.owner_user_id = users.id " \
         "AND opportunities.status IN (?)", OPEN_STATUSES]
      )

      consultant = tenant.users.kept
                         .where(role: "consultant", active: true)
                         .joins(open_join)
                         .group("users.id")
                         .select("users.*")
                         .order(Arel.sql("COUNT(opportunities.id) ASC"))
                         .first

      return consultant if consultant

      tenant.users.kept.where(role: "manager", active: true).order(:id).first ||
        tenant.users.kept.where(role: "consultant", active: true).order(:id).first ||
        tenant.users.kept.where(role: "admin", active: true).order(:id).first
    end
  end
end
