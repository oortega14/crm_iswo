# frozen_string_literal: true

module Notifications
  # Notificaciones RFC §6.2 al crear un DuplicateFlag (alta de oportunidad).
  # - Dueño de la oportunidad existente y consultor que registró
  # - Admin y manager del tenant (bandeja de duplicados en tiempo casi real)
  class DuplicateCollisionNotifier
    def self.call(tenant:, flag:, existing_opp:, registrar:)
      new(tenant: tenant, flag: flag, existing_opp: existing_opp, registrar: registrar).call
    end

    def initialize(tenant:, flag:, existing_opp:, registrar:)
      @tenant       = tenant
      @flag         = flag
      @existing_opp = existing_opp
      @registrar    = registrar
    end

    def call
      notify_owner_and_registrar
      notify_staff
    end

    private

    def contact_label
      @existing_opp.contact&.display_name.presence || "este prospecto"
    end

    def since_label
      @existing_opp.created_at&.strftime("%d/%m/%Y") || "—"
    end

    def owner
      @existing_opp.owner_user
    end

    def notify_owner_and_registrar
      if owner.present? && owner.id != @registrar.id
        Notification.create!(
          tenant:   @tenant,
          user:     owner,
          kind:     "duplicate_found",
          title:    "Posible duplicado detectado",
          body:     "#{@registrar.name} registró otra oportunidad para #{contact_label} " \
                    "que ya tienes en tu pipeline.",
          resource: @existing_opp
        )
      end

      return if @registrar.blank?

      owner_label = owner&.name.presence || "otro consultor"
      Notification.create!(
        tenant:   @tenant,
        user:     @registrar,
        kind:     "duplicate_found",
        title:    "Prospecto ya registrado",
        body:     "#{contact_label} ya tiene una oportunidad con #{owner_label} desde #{since_label}.",
        resource: @flag.opportunity
      )
    end

    def notify_staff
      owner_label = owner&.name.presence || "otro consultor"
      body = "#{@registrar.name} registró un posible duplicado de #{contact_label} " \
             "(ya con #{owner_label} desde #{since_label}). Revisa la bandeja de duplicados."

      @tenant.users.active.where(role: %w[admin manager]).find_each do |staff|
        next if staff.id == @registrar.id
        next if owner.present? && staff.id == owner.id

        Notification.create!(
          tenant:   @tenant,
          user:     staff,
          kind:     "duplicate_found",
          title:    "Nuevo duplicado en el tenant",
          body:     body,
          resource: @flag.opportunity
        )
      end
    end
  end
end
