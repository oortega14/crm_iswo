# frozen_string_literal: true

module Contacts
  # Al crear un contacto manualmente, abre una oportunidad en el pipeline por defecto
  # (cada lead nuevo es un prospecto visible en Oportunidades para admin/manager).
  class ProspectOpportunityCreator
    def self.call(contact:, actor:)
      new(contact: contact, actor: actor).call
    end

    def initialize(contact:, actor:)
      @contact = contact
      @actor   = actor
      @tenant  = contact.tenant
    end

    def call
      return nil unless @contact.kept?
      return nil if @tenant.opportunities.kept.open.where(contact_id: @contact.id).exists?

      pipeline = @tenant.pipelines.find_by(is_default: true) || @tenant.pipelines.first
      stage    = pipeline&.pipeline_stages&.order(:position)&.first
      unless pipeline && stage
        Rails.logger.warn("[ProspectOpportunityCreator] Sin pipeline/etapa en tenant #{@tenant.id}")
        return nil
      end

      owner  = @contact.owner_user || @actor
      source = @tenant.lead_sources.find_by(kind: "manual") || @tenant.lead_sources.first

      opp = @tenant.opportunities.create!(
        contact:          @contact,
        pipeline:         pipeline,
        pipeline_stage:   stage,
        owner_user:       owner,
        lead_source:      source,
        status:           "new_lead",
        title:            default_title,
        currency:         @tenant.currency,
        last_activity_at: Time.current
      )

      opp.opportunity_logs.create!(
        tenant:       @tenant,
        user:         @actor,
        action:       "create",
        changes_data: { origin: "contact_create", contact_id: @contact.id }
      )

      Opportunities::DuplicateFlagsCreator.new(tenant: @tenant, actor: @actor).call(opp, @contact)
      notify_new_lead(opp)

      opp
    end

    private

    def default_title
      name = @contact.display_name.presence || "Sin nombre"
      "Prospecto — #{name}"
    end

    def notify_new_lead(opportunity)
      return unless defined?(Notifications::NewLeadNotifier)

      source = opportunity.lead_source
      Notifications::NewLeadNotifier.call(
        opportunity:  opportunity,
        actor:        @actor,
        source_kind:  source&.kind || "manual",
        source_label: source&.name
      )
    rescue NameError, ActiveRecord::RecordInvalid => e
      Rails.logger.warn("[Notification] new_lead contact=#{@contact.id}: #{e.message}")
    end
  end
end
