# frozen_string_literal: true

module Notifications
  # Copia in-app a admin/manager cuando entra un lead por landing (visibilidad global del tenant).
  class LandingLeadStaffNotifier
    STAFF_ROLES = %w[admin manager].freeze

    def self.call(opportunity:, landing: nil)
      new(opportunity: opportunity, landing: landing).call
    end

    def initialize(opportunity:, landing: nil)
      @opportunity = opportunity
      @landing     = landing
      @tenant      = opportunity.tenant
    end

    def call
      owner_id = @opportunity.owner_user_id
      label    = @opportunity.contact&.display_name.presence || @opportunity.title
      origin   = @landing&.title.presence || @landing&.slug.presence || "landing web"

      recipients = @tenant.users.kept.where(active: true, role: STAFF_ROLES)
      recipients = recipients.where.not(id: owner_id) if owner_id.present?

      recipients.find_each do |user|
        Notification.create!(
          tenant:   @tenant,
          user:     user,
          kind:     "new_lead",
          title:    "Lead desde landing",
          body:     "Nuevo lead «#{label}» desde #{origin}. Asignado al consultor del turno.",
          resource: @opportunity
        )
      end
      true
    rescue ActiveRecord::RecordInvalid => e
      Rails.logger.warn("[LandingLeadStaffNotifier] opp=#{@opportunity.id}: #{e.message}")
      false
    end
  end
end
