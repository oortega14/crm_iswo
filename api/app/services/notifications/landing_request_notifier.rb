# frozen_string_literal: true

module Notifications
  # ==========================================================================
  # LandingRequestNotifier — avisa del flujo de aprobación de landings.
  # ==========================================================================
  # Solicitante y aprobador viven en tenants distintos (el aprobador es el
  # tenant plataforma `super-admin`), así que cada notificación se crea
  # explícitamente dentro del tenant de su destinatario.
  # ==========================================================================
  class LandingRequestNotifier
    def self.submitted(landing:, requested_by:)
      new(landing: landing).notify_platform_admins(requested_by)
    end

    def self.resolved(landing:, approved:)
      new(landing: landing).notify_requester(approved: approved)
    end

    def initialize(landing:)
      @landing = landing
    end

    def notify_platform_admins(requested_by)
      platform_tenant = ActsAsTenant.without_tenant { Tenant.kept.find_by(slug: PlatformTenant::SLUG) }
      return false unless platform_tenant

      origin = @landing.tenant&.name.presence || @landing.tenant&.slug

      ActsAsTenant.with_tenant(platform_tenant) do
        platform_tenant.users.kept.where(active: true, role: "admin").find_each do |admin|
          Notification.create!(
            tenant:   platform_tenant,
            user:     admin,
            kind:     "landing_request_submitted",
            title:    "Nueva landing por aprobar",
            body:     "#{requested_by&.name.presence || 'Un usuario'} (#{origin}) solicitó publicar la landing «#{@landing.title}».",
            resource: @landing
          )
        end
      end
      true
    rescue ActiveRecord::RecordInvalid => e
      Rails.logger.warn("[LandingRequestNotifier] submitted landing=#{@landing.id} #{e.message}")
      false
    end

    def notify_requester(approved:)
      return false if @landing.requested_by_user_id.blank?

      ActsAsTenant.with_tenant(@landing.tenant) do
        Notification.create!(
          tenant:   @landing.tenant,
          user:     @landing.requested_by,
          kind:     approved ? "landing_request_approved" : "landing_request_rejected",
          title:    approved ? "Landing habilitada" : "Landing rechazada",
          body:     approved ? "Tu landing «#{@landing.title}» fue aprobada y ya está habilitada." : rejected_body,
          resource: @landing
        )
      end
      true
    rescue ActiveRecord::RecordInvalid => e
      Rails.logger.warn("[LandingRequestNotifier] resolved landing=#{@landing.id} #{e.message}")
      false
    end

    private

    def rejected_body
      reason = @landing.rejection_reason.presence
      base   = "Tu landing «#{@landing.title}» fue rechazada."
      reason ? "#{base} Motivo: #{reason}" : base
    end
  end
end
