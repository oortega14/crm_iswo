# frozen_string_literal: true

module Contacts
  # ==========================================================================
  # Contacts::Stats — métricas rápidas para la pantalla de contactos (SPA).
  # ==========================================================================
  # Cuenta contactos distintos según el estado de sus oportunidades (policy scope).
  #
  #   clients    — al menos una oportunidad ganada (won)
  #   prospects  — al menos una oportunidad abierta en pipeline
  #   hot_leads  — al menos una oportunidad abierta con temperatura hot
  #   stale      — al menos una oportunidad abierta sin actividad reciente
  # ==========================================================================
  class Stats
    SEGMENTS = %w[clients prospects hot_leads stale].freeze

    def initialize(user:, tenant:)
      @user   = user
      @tenant = tenant
    end

    def call
      contacts  = ContactPolicy::Scope.new(@user, Contact.kept).resolve
      opps      = OpportunityPolicy::Scope.new(@user, Opportunity.kept).resolve
      open_opps = opps.open
      stale_days = @tenant.settings&.dig("stale_days").presence&.to_i || 7
      stale_days = 7 if stale_days < 1

      {
        clients:    contacts.where(id: opps.won.select(:contact_id)).count,
        prospects:  contacts.where(id: open_opps.select(:contact_id)).count,
        hot_leads:  contacts.where(id: open_opps.hot.select(:contact_id)).count,
        stale:      contacts.where(id: open_opps.stale(stale_days).select(:contact_id)).count,
        stale_days: stale_days
      }
    end

    def self.apply_segment(scope, segment:, user:, tenant:)
      return scope unless SEGMENTS.include?(segment.to_s)

      opps = OpportunityPolicy::Scope.new(user, Opportunity.kept).resolve
      open_opps = opps.open
      stale_days = tenant.settings&.dig("stale_days").presence&.to_i || 7
      stale_days = 7 if stale_days < 1

      contact_ids =
        case segment.to_s
        when "clients"
          opps.won.select(:contact_id)
        when "prospects"
          open_opps.select(:contact_id)
        when "hot_leads"
          open_opps.hot.select(:contact_id)
        when "stale"
          open_opps.stale(stale_days).select(:contact_id)
        end

      scope.where(id: contact_ids)
    end
  end
end
