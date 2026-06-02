# frozen_string_literal: true

namespace :leads do
  desc "Importa lead de prueba (Meta + landing). TENANT=iswo OWNER_EMAIL=laura@iswo.local"
  task demo_import: :environment do
    slug = ENV.fetch("TENANT", "iswo")
    tenant = Tenant.find_by!(slug: slug)
    forced_owner = ENV["OWNER_EMAIL"].presence && tenant.users.find_by(email: ENV["OWNER_EMAIL"])

    ActsAsTenant.with_tenant(tenant) do
      ensure_lead_source!(tenant, "meta", "Meta Ads")
      ensure_lead_source!(tenant, "web", "Web")

      if forced_owner
        puts "Forzando asignación a: #{forced_owner.name} <#{forced_owner.email}>\n"
      end

      stamp = Time.current.to_i
      meta_email = "lead.meta.#{stamp}@ejemplo.co"
      web_email  = "lead.web.#{stamp}@ejemplo.co"

      puts "\n=== Tenant: #{tenant.slug} (#{tenant.name}) ===\n"

      meta_opp = import_meta_lead!(tenant, meta_email, stamp, forced_owner)
      print_result("Meta Ads", meta_opp)

      web_opp = import_landing_lead!(tenant, web_email, stamp, forced_owner)
      print_result("Landing web", web_opp)
    end

    puts "\nEn el SPA: inicia sesión con el usuario «Asignado a» y abre la campana."
    puts "Credenciales seeds: Password123!\n"
  end

  def ensure_lead_source!(tenant, kind, name)
    tenant.lead_sources.find_or_create_by!(kind: kind) do |ls|
      ls.name = name
      ls.active = true
    end
  end

  def import_meta_lead!(tenant, email, stamp, owner = nil)
    result = Opportunities::LeadImporter.new(
      tenant:       tenant,
      attrs:        {
        "full_name" => "Lead Prueba Meta #{stamp}",
        "email"     => email,
        "phone"     => "300555#{format('%04d', stamp % 10_000)}"
      },
      source_kind:  "meta",
      source_label: "demo_meta_campana",
      owner_user:   owner
    ).call
    result.opportunity
  end

  def import_landing_lead!(tenant, email, stamp, forced_owner = nil)
    landing = tenant.landing_pages.published.first ||
              tenant.landing_pages.first ||
              tenant.landing_pages.create!(
                title:        "Landing demo",
                slug:         "demo-#{stamp}",
                published:    true,
                published_at: Time.current,
                content:      {},
                styles:       {}
              )

    submission = LandingFormSubmission.create!(
      tenant:       tenant,
      landing_page: landing,
      payload:      {
        "name"  => "Lead Prueba Web #{stamp}",
        "email" => email,
        "phone" => "+57310555#{format('%04d', stamp % 10_000)}"
      },
      utm_source:   "demo",
      utm_medium:   "rake",
      utm_campaign: "leads_demo_import"
    )

    LandingSubmissionProcessor.new(submission).call
    opp = submission.reload.opportunity
    if forced_owner && opp && opp.owner_user_id != forced_owner.id
      opp.update!(owner_user: forced_owner)
      Notifications::NewLeadNotifier.call(
        opportunity:  opp,
        source_kind:  "web",
        source_label: submission.landing_page&.title.presence || submission.landing_page&.slug
      )
    end
    opp
  end

  def print_result(channel, opp)
    puts "--- #{channel} ---"
    if opp.blank?
      puts "  ERROR: no se creó oportunidad"
      puts ""
      return
    end

    owner = opp.owner_user
    puts "  Oportunidad ##{opp.id}: #{opp.title}"
    puts "  Contacto: #{opp.contact&.display_name} (#{opp.contact&.email})"
    puts "  Asignado a: #{owner&.name} <#{owner&.email}>"

    if owner
      unread = owner.notifications.kind_new_lead.unread.count
      last = owner.notifications.kind_new_lead.order(created_at: :desc).first
      puts "  Notificaciones new_lead sin leer: #{unread}"
      puts "  Última: «#{last&.title}» — #{last&.body}" if last
    else
      puts "  AVISO: sin owner_user (no habrá campana)"
    end
    puts ""
  end
end
