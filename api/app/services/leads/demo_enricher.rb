# frozen_string_literal: true

module Leads
  # Añade recordatorios y duplicate_flags a leads demo ya importados.
  class DemoEnricher
    include DemoSupport

    TENANT_SLUGS = DemoPack::TENANT_SLUGS

    def self.run!(tenant_slugs: TENANT_SLUGS)
      new(tenant_slugs: tenant_slugs).run!
    end

    def initialize(tenant_slugs:)
      @tenant_slugs = tenant_slugs
    end

    def run!
      puts "\n#{'=' * 72}"
      puts " DEMO ENRICH — recordatorios + duplicados"
      puts "=" * 72

      @tenant_slugs.each do |slug|
        tenant = ActsAsTenant.without_tenant { Tenant.find_by(slug: slug) }
        unless tenant
          puts "\n[#{slug}] tenant no encontrado"
          next
        end

        ActsAsTenant.with_tenant(tenant) { enrich_tenant!(tenant) }
      end

      puts "\n#{'=' * 72}"
      puts " Listo. Verifica /reminders y /duplicates (admin o manager)."
      puts "=" * 72
    end

    private

    def enrich_tenant!(tenant)
      opps     = demo_opportunities(tenant).to_a
      detector = staff_user_for(tenant)

      puts "\n### #{tenant.slug} — #{opps.size} leads demo ###"

      if opps.empty?
        puts "  Sin leads @leads.iswo.test — ejecuta: bundle exec rails leads:demo_pack"
        return
      end

      unless detector
        puts "  ERROR: no hay admin/manager para detected_by_user"
        return
      end

      reminders_added = 0
      opps.each_with_index do |opp, i|
        next if opp.reminders.status_pending.exists?

        attach_demo_reminder!(opp, i)
        reminders_added += 1
        puts "  • Opp ##{opp.id}: recordatorio creado"
      rescue StandardError => e
        puts "  • Opp ##{opp.id}: recordatorio ERROR — #{e.message}"
      end

      collisions_added = ensure_collision_opportunities!(tenant, opps, detector)

      flags_added = 0
      demo_opportunities(tenant).find_each do |opp|
        meta = flag_demo_duplicates!(tenant, opp, opp.contact, detector)
        flags_added += 1 if meta.to_s.include?("dup flag")
      end

      pending_dups = tenant.duplicate_flags.resolution_pending.count
      pending_rems = tenant.reminders.status_pending.count

      puts "  Resumen: +#{reminders_added} recordatorios, +#{collisions_added} opps colisión, " \
           "+#{flags_added} flags nuevos, #{pending_dups} duplicados pendientes, " \
           "#{pending_rems} recordatorios pendientes (tenant)"
    end

    # Segunda opp en el mismo contacto para generar flags (pares en índices 0 y 2).
    def ensure_collision_opportunities!(tenant, opps, detector)
      created = 0
      [0, 2].each do |idx|
        base = opps[idx]
        next unless base&.contact

        open_count = tenant.opportunities.kept
                          .where(contact_id: base.contact_id)
                          .where.not(status: %w[won lost merged])
                          .count
        next if open_count >= 2

        owner = base.owner_user || Leads::RoundRobinOwner.call(tenant)
        dup_opp = tenant.opportunities.create!(
          contact:          base.contact,
          pipeline:         base.pipeline,
          pipeline_stage:   base.pipeline_stage,
          owner_user:       owner,
          lead_source:      base.lead_source,
          title:            "#{base.title} — colisión demo",
          status:           "new_lead",
          temperature:      "warm",
          estimated_value:  base.estimated_value,
          last_activity_at: Time.current
        )
        flag_demo_duplicates!(tenant, dup_opp, base.contact, detector)
        puts "  • Opp ##{dup_opp.id}: colisión con ##{base.id} (contacto ##{base.contact_id})"
        created += 1
      rescue StandardError => e
        puts "  • Colisión idx #{idx}: ERROR — #{e.message}"
      end
      created
    end
  end
end
