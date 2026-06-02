# frozen_string_literal: true

module Notifications
  # Notifica al consultor asignado cuando entra un lead nuevo (canales automáticos o alta por otro usuario).
  class NewLeadNotifier
    SOURCE_KIND_LABELS = {
      "meta"     => "Meta Ads",
      "google"   => "Google Ads",
      "whatsapp" => "WhatsApp",
      "web"      => "Web",
      "manual"   => "Manual",
      "referral" => "Referido"
    }.freeze

    def self.call(opportunity:, actor: nil, source_kind: nil, source_label: nil)
      new(
        opportunity:  opportunity,
        actor:        actor,
        source_kind:  source_kind,
        source_label: source_label
      ).call
    end

    def initialize(opportunity:, actor: nil, source_kind: nil, source_label: nil)
      @opportunity  = opportunity
      @actor        = actor
      @source_kind  = source_kind.presence || @opportunity.lead_source&.kind
      @source_label = source_label.presence || @opportunity.contact&.source_label.presence
    end

    def call
      owner = @opportunity.owner_user
      return false unless owner
      return false if @actor&.id == owner.id

      Notification.create!(
        tenant:   @opportunity.tenant,
        user:     owner,
        kind:     "new_lead",
        title:    "Nuevo lead",
        body:     build_body,
        resource: @opportunity
      )
      true
    rescue ActiveRecord::RecordInvalid => e
      Rails.logger.warn(
        "[Notification] new_lead opp=#{@opportunity.id}: #{e.message}"
      )
      false
    end

    private

    def build_body
      label  = @opportunity.contact&.display_name.presence || @opportunity.title
      origin = origin_label

      if @actor
        "#{@actor.name} te asignó el lead «#{label}»#{origin}"
      else
        "Nuevo lead «#{label}»#{origin}"
      end
    end

    def origin_label
      parts = []
      parts << @source_label if @source_label.present?
      parts << SOURCE_KIND_LABELS[@source_kind] if @source_kind.present? && parts.empty?
      parts << @opportunity.lead_source&.name if parts.empty? && @opportunity.lead_source&.name.present?
      return "" if parts.empty?

      " desde #{parts.first}"
    end
  end
end
