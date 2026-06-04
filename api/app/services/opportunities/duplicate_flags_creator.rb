# frozen_string_literal: true

module Opportunities
  # Crea DuplicateFlag y notificaciones al registrar una oportunidad nueva (RFC §6.2).
  class DuplicateFlagsCreator
    def initialize(tenant:, actor:)
      @tenant = tenant
      @actor  = actor
    end

    def call(opportunity, contact)
      duplicate_candidate_opportunities(contact, except_opportunity_id: opportunity.id).each do |existing|
        create_flag_if_needed!(opportunity, existing, contact)
      end
    end

    private

    def duplicate_candidate_opportunities(contact, except_opportunity_id:)
      scope = open_opportunities_scope.where.not(id: except_opportunity_id)
      opps  = scope.where(contact_id: contact.id).to_a

      if contact.phone_e164.present? || contact.email.present?
        DuplicateDetector.new(
          phone:              contact.phone_e164,
          email:              contact.email,
          exclude_contact_id: contact.id,
          threshold:          0.95
        ).call.each do |match|
          opps.concat(scope.where(contact_id: match.contact.id).to_a)
        end
      end

      opps.uniq(&:id)
    end

    def open_opportunities_scope
      @tenant.opportunities.kept.where.not(status: %w[won lost merged])
    end

    def create_flag_if_needed!(opportunity, existing, contact)
      return if existing.id == opportunity.id

      flags = DuplicateFlag.where(tenant_id: @tenant.id)
      return if flags.exists?(opportunity_id: opportunity.id, duplicate_of_opportunity_id: existing.id)
      return if flags.exists?(opportunity_id: existing.id, duplicate_of_opportunity_id: opportunity.id)

      flag = DuplicateFlag.create!(
        tenant:                   @tenant,
        opportunity:              opportunity,
        duplicate_of_opportunity: existing,
        detected_by_user:         @actor,
        matched_on:               matched_on_for(contact),
        match_score:              1.0
      )
      notify_collision!(flag, existing)
    rescue ActiveRecord::RecordInvalid => e
      Rails.logger.warn("[DuplicateFlag] opp=#{opportunity.id} vs #{existing.id}: #{e.message}")
    end

    def matched_on_for(contact)
      if contact.phone_e164.present? && contact.email.present?
        "both"
      elsif contact.phone_e164.present?
        "phone"
      else
        "email"
      end
    end

    def notify_collision!(flag, existing_opp)
      Notifications::DuplicateCollisionNotifier.call(
        tenant:       @tenant,
        flag:         flag,
        existing_opp: existing_opp,
        registrar:    @actor
      )
    rescue ActiveRecord::RecordInvalid => e
      Rails.logger.warn("[Notification] duplicado: #{e.message}")
    end
  end
end
