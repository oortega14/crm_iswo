# frozen_string_literal: true

module Exports
  # ==========================================================================
  # Exports::ScopedCollection — aplica policy_scope + filtros Ransack al export.
  # ==========================================================================
  class ScopedCollection
    def initialize(user:, resource:, filters: {})
      @user = user
      @resource = resource.to_s
      @filters = filters.is_a?(Hash) ? filters.deep_stringify_keys : {}
    end

    def resolve
      scope = base_scope
      return scope unless scope.respond_to?(:ransack) && @filters.present?

      scope.ransack(@filters).result
    end

    private

    def base_scope
      case @resource
      when "contacts"
        ContactPolicy::Scope.new(@user, Contact.kept).resolve
      when "opportunities"
        OpportunityPolicy::Scope.new(@user, Opportunity.kept).resolve
      else
        raise ArgumentError, "Recurso no soportado: #{@resource}"
      end
    end
  end
end
