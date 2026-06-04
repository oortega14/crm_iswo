# frozen_string_literal: true

module Leads
  # Crea 5 leads demo por tenant (Meta, Web, Google), asignados a consultores,
  # con recordatorios y colisiones (duplicate_flags) para probar el SPA.
  class DemoPack
    include DemoSupport

    TENANT_SLUGS = %w[iswo micasita libranzas].freeze

    LeadSpec = Struct.new(
      :channel,
      :full_name,
      :company,
      :source_label,
      :duplicate_phone_key,
      :duplicate_email_key,
      keyword_init: true
    )

    PACKS = {
      "iswo" => [
        LeadSpec.new(channel: :meta,   full_name: "Camila Restrepo",  company: "Ferretería Andina",  source_label: "ISO Q1", duplicate_phone_key: "p1"),
        LeadSpec.new(channel: :meta,   full_name: "Camila R. (dup)",  company: "Ferretería Andina",  source_label: "ISO Q1", duplicate_phone_key: "p1"),
        LeadSpec.new(channel: :web,    full_name: "Lucía Montoya",    company: "Hospital Central",   source_label: "Landing ISO", duplicate_email_key: "e1"),
        LeadSpec.new(channel: :web,    full_name: "Lucía M. (dup)",   company: "Hospital Central",   source_label: "Landing ISO", duplicate_email_key: "e1"),
        LeadSpec.new(channel: :google, full_name: "Patricia Gómez",   company: "Logística Express",  source_label: "Search Brand")
      ],
      "micasita" => [
        LeadSpec.new(channel: :meta,   full_name: "Carolina Méndez",  company: nil, source_label: "Proyecto VIS", duplicate_phone_key: "p1"),
        LeadSpec.new(channel: :meta,   full_name: "Carolina M. (dup)", company: nil, source_label: "Proyecto VIS", duplicate_phone_key: "p1"),
        LeadSpec.new(channel: :web,    full_name: "Gustavo Pineda",   company: nil, source_label: "Web Mi Casita", duplicate_email_key: "e1"),
        LeadSpec.new(channel: :web,    full_name: "Gustavo P. (dup)", company: nil, source_label: "Web Mi Casita", duplicate_email_key: "e1"),
        LeadSpec.new(channel: :google, full_name: "Diego Herrera",    company: nil, source_label: "Casas Bogotá")
      ],
      "libranzas" => [
        LeadSpec.new(channel: :meta,   full_name: "Gloria Peñaloza",  company: "Alcaldía Medellín", source_label: "Libranza Q2", duplicate_phone_key: "p1"),
        LeadSpec.new(channel: :meta,   full_name: "Gloria P. (dup)",  company: "Alcaldía Medellín", source_label: "Libranza Q2", duplicate_phone_key: "p1"),
        LeadSpec.new(channel: :web,    full_name: "Beatriz Lozano",   company: "SENA Regional",       source_label: "Web Libranzas", duplicate_email_key: "e1"),
        LeadSpec.new(channel: :web,    full_name: "Beatriz L. (dup)", company: "SENA Regional",       source_label: "Web Libranzas", duplicate_email_key: "e1"),
        LeadSpec.new(channel: :google, full_name: "Adriana Castaño",  company: "EPS Salud Total",     source_label: "Crédito nómina")
      ]
    }.freeze

    CHANNEL_TO_SOURCE = { meta: "meta", web: "web", google: "google" }.freeze

    def self.run!(tenant_slugs: TENANT_SLUGS, batch_stamp: Time.current.to_i)
      new(tenant_slugs: tenant_slugs, batch_stamp: batch_stamp).run!
    end

    def initialize(tenant_slugs:, batch_stamp:)
      @tenant_slugs = tenant_slugs
      @batch_stamp  = batch_stamp
      @owner_index  = {}
      @phones       = {}
      @emails       = {}
    end

    def run!
      puts "\n#{'=' * 72}"
      puts " DEMO PACK — #{@batch_stamp} — 5 leads × #{@tenant_slugs.size} tenants"
      puts " (consultores + recordatorios + duplicados)"
      puts "=" * 72

      @tenant_slugs.each do |slug|
        tenant = ActsAsTenant.without_tenant { Tenant.find_by(slug: slug) }
        unless tenant
          puts "\n[demo_pack] Tenant no encontrado: #{slug}"
          next
        end

        ActsAsTenant.with_tenant(tenant) { seed_and_print_tenant!(tenant) }
      end

      print_verification_guide
    end

    private

    def seed_and_print_tenant!(tenant)
      ensure_prerequisites!(tenant)
      specs = PACKS[tenant.slug] || default_pack_for(tenant.slug)
      detector = staff_user_for(tenant)

      puts "\n### #{tenant.name} (tenant: #{tenant.slug}) ###\n"

      specs.each_with_index do |spec, i|
        print_lead_line(spec, i, import_one!(tenant, spec, i, detector))
      end

      pending_dups = tenant.duplicate_flags.resolution_pending.count
      pending_rem  = tenant.reminders.status_pending.count
      referral_n   = ensure_referral_network!(tenant)
      puts "\n  Resumen: #{pending_dups} duplicados pendientes, #{pending_rem} recordatorios pendientes" \
           "#{referral_n.positive? ? ", +#{referral_n} enlaces red" : ", red OK (#{tenant.referral_networks.count} enlaces)"}"
      puts "\n  Consultores (login Password123!):"
      consultants = tenant.users.kept.where(role: "consultant", active: true).order(:email)
      if consultants.none?
        puts "    (ningún consultor activo — ejecuta: bundle exec rails db:seed)"
      else
        consultants.each { |u| puts "    #{consultant_summary_line(u)}" }
      end
    end

    def print_lead_line(spec, index, result)
      ch = spec.channel.to_s.upcase
      if result[:ok]
        extras = [result[:reminder], result[:duplicate]].compact.join(" | ")
        suffix = extras.present? ? " | #{extras}" : ""
        puts "  #{index + 1}. [#{ch}] #{result[:line]}#{suffix}"
      else
        puts "  #{index + 1}. [#{ch}] ERROR: #{result[:error]}"
      end
    end

    def import_one!(tenant, spec, index, detector)
      seq   = "#{@batch_stamp}#{tenant.id}#{index}"
      email = resolve_email(tenant, seq, spec)
      phone = resolve_phone(tenant, seq, spec)
      owner = next_consultant_owner!(tenant)

      result = Opportunities::LeadImporter.new(
        tenant:       tenant,
        attrs:        attrs_hash(spec, email, phone),
        source_kind:  CHANNEL_TO_SOURCE.fetch(spec.channel),
        source_label: spec.source_label || "demo_pack_#{spec.channel}",
        owner_user:   owner
      ).call

      opp = result.opportunity
      return { ok: false, error: "no se creó oportunidad" } unless opp

      apply_demo_traits!(opp, index)
      reminder_meta = begin
        attach_demo_reminder!(opp, index)
      rescue StandardError => e
        "recordatorio omitido: #{e.message}"
      end
      dup_meta      = flag_demo_duplicates!(tenant, opp, opp.contact, detector)

      contact_name = opp.contact&.display_name || opp.title
      owner_email  = opp.owner_user&.email || "sin dueño"
      {
        ok:        true,
        line:      "Opp ##{opp.id} — #{contact_name} → #{owner_email}",
        reminder:  reminder_meta,
        duplicate: dup_meta
      }
    rescue StandardError => e
      { ok: false, error: "#{e.class}: #{e.message}" }
    end

    def resolve_phone(tenant, seq, spec)
      key = spec.duplicate_phone_key
      if key.present?
        cache = "#{tenant.id}:phone:#{key}"
        return @phones[cache] if @phones[cache]

        phone = phone_for(tenant, seq)
        @phones[cache] = phone
        return phone
      end

      phone_for(tenant, seq)
    end

    def resolve_email(tenant, seq, spec)
      key = spec.duplicate_email_key
      if key.present?
        cache = "#{tenant.id}:email:#{key}"
        return @emails[cache] if @emails[cache]

        email = "demo.#{tenant.slug}.#{key}.#{@batch_stamp}@leads.iswo.test"
        @emails[cache] = email
        return email
      end

      "demo.#{tenant.slug}.#{seq}@leads.iswo.test"
    end

    def next_consultant_owner!(tenant)
      pool = tenant.users.kept.where(role: "consultant", active: true).order(:id).to_a
      return Leads::RoundRobinOwner.call(tenant) if pool.empty?

      idx = @owner_index[tenant.id] ||= 0
      user = pool[idx % pool.size]
      @owner_index[tenant.id] = idx + 1
      user
    end

    def ensure_prerequisites!(tenant)
      %w[meta google web manual].each do |kind|
        label = { "meta" => "Meta Ads", "google" => "Google Ads", "web" => "Web", "manual" => "Manual" }[kind]
        tenant.lead_sources.find_or_create_by!(kind: kind) do |ls|
          ls.name   = label
          ls.active = true
        end
      end

      return if tenant.pipelines.exists?

      pipeline = tenant.pipelines.create!(name: "Principal", is_default: true)
      %w[Nueva Contactada Calificada Propuesta Ganada].each_with_index do |name, i|
        pipeline.pipeline_stages.create!(
          tenant:      tenant,
          name:        name,
          position:    i,
          probability: [10, 30, 50, 75, 100][i] || 10,
          closed_won:  name == "Ganada",
          closed_lost: false
        )
      end
    end

    def attrs_hash(spec, email, phone)
      parts = spec.full_name.split
      {
        "full_name"  => spec.full_name,
        "first_name" => parts.first,
        "last_name"  => parts[1..]&.join(" "),
        "email"      => email,
        "phone"      => phone,
        "company_name" => spec.company
      }.compact
    end

    def phone_for(tenant, seq)
      prefix = { "iswo" => "300", "micasita" => "310", "libranzas" => "320" }[tenant.slug] || "300"
      "+57#{prefix}#{seq.to_s[-7..].rjust(7, '0')}"
    end

    def apply_demo_traits!(opp, index)
      temps = %w[hot warm warm cold hot]
      opp.update!(
        temperature:      temps[index % temps.size],
        estimated_value:  (index + 1) * 5_000_000,
        last_activity_at: Time.current
      )
    end

    def consultant_summary_line(user)
      unread = user.notifications.kind_new_lead.unread.count
      opps   = user.owned_opportunities.where(status: Leads::RoundRobinOwner::OPEN_STATUSES).count
      rems   = user.reminders.status_pending.count
      "• #{user.email} — #{unread} new_lead, #{opps} opps abiertas, #{rems} recordatorios"
    end

    def default_pack_for(slug)
      5.times.map do |i|
        LeadSpec.new(
          channel:             %i[meta meta web web google][i],
          full_name:           "Lead Demo #{slug} #{i + 1}",
          company:             "Empresa demo",
          source_label:        "demo_pack",
          duplicate_phone_key: (i < 2 ? "p1" : nil),
          duplicate_email_key: (i >= 2 && i < 4 ? "e1" : nil)
        )
      end
    end

    def print_verification_guide
      puts <<~GUIDE

        #{'=' * 72}
        GUÍA — Pantallas a verificar (repite por iswo, micasita, libranzas)
        #{'=' * 72}

        LOGIN     Empresa = slug del tenant | Password: Password123!
        DASHBOARD /       KPIs, embudo, BANT, actividad
        OPORTUNIDADES /opportunities   Kanban (5 leads/consultor rotado)
        RECORDATORIOS /reminders       5 por tenant (2 vencidos)
        DUPLICADOS  /duplicates        2 flags pendientes por tenant (admin/manager)
        CONTACTOS   /contacts         Buscar @leads.iswo.test
        RED         /network          Árbol admin → manager → consultores
        CAMPANA     Header              new_lead + duplicate_found

        Consultores iswo:      laura@iswo.local, carlos@iswo.local
        Consultores micasita:  andres@micasita.local, diana@micasita.local
        Consultores libranzas: maria@libranzas.local, luis@libranzas.local

        Solo recordatorios/duplicados: bundle exec rails leads:demo_enrich
        Todo: bundle exec rails leads:demo_full
        #{'=' * 72}
      GUIDE
    end
  end
end
