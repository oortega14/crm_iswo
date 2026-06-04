# frozen_string_literal: true

namespace :leads do
  desc "5 leads demo × tenant (iswo,micasita,libranzas): opps, contactos, recordatorios, duplicados, red"
  task demo_pack: :environment do
    slugs = ENV.fetch("TENANTS", "iswo,micasita,libranzas").split(",").map(&:strip)
    Leads::DemoPack.run!(tenant_slugs: slugs, batch_stamp: Time.current.to_i)
  end

  desc "Recordatorios + duplicados en leads demo existentes (@leads.iswo.test). TENANTS=iswo,..."
  task demo_enrich: :environment do
    slugs = ENV.fetch("TENANTS", "iswo,micasita,libranzas").split(",").map(&:strip)
    Leads::DemoEnricher.run!(tenant_slugs: slugs)
  end

  desc "Leads demo completos: pack + enrich (dashboard, opps, contactos, recordatorios, duplicados, red)"
  task demo_full: %i[demo_pack demo_enrich]

  desc "Cuenta oportunidades y contactos demo por tenant. Ej: TENANTS=iswo"
  task status: :environment do
    slugs = ENV.fetch("TENANTS", "iswo,micasita,libranzas").split(",").map(&:strip)
    pattern = Leads::DemoSupport::DEMO_EMAIL_PATTERN
    puts "\n=== Leads demo (#{pattern}) ===\n"
    slugs.each do |slug|
      tenant = ActsAsTenant.without_tenant { Tenant.find_by(slug: slug) }
      unless tenant
        puts "#{slug}: tenant no encontrado"
        next
      end
      ActsAsTenant.with_tenant(tenant) do
        demo_contacts = Contact.kept.where("email LIKE ?", pattern).count
        opps = Opportunity.kept.count
        pipeline = tenant.pipelines.find_by(is_default: true) || tenant.pipelines.first
        on_default = pipeline ? Opportunity.kept.where(pipeline_id: pipeline.id).count : 0
        puts "#{slug}: #{opps} oportunidades (#{on_default} en pipeline «#{pipeline&.name || '—'}»), #{demo_contacts} contactos demo"
        if demo_contacts.zero?
          puts "  → Sin pack demo. Ejecuta: TENANTS=#{slug} bundle exec rails leads:demo_pack"
        end
      end
    end
    puts "\nLogin admin: admin@#{slugs.first}.local (o el slug del tenant) | Password123!"
    puts "Consultores solo ven sus oportunidades; admin/manager ven todas.\n"
  end

  desc "Lista consultores activos. Ej: TENANTS=iswo,micasita"
  task list_consultants: :environment do
    slugs = ENV.fetch("TENANTS", "iswo,micasita,libranzas").split(",").map(&:strip)
    slugs.each do |slug|
      tenant = ActsAsTenant.without_tenant { Tenant.find_by(slug: slug) }
      unless tenant
        puts "#{slug}: no encontrado"
        next
      end
      ActsAsTenant.with_tenant(tenant) do
        emails = User.kept.where(role: "consultant", active: true).order(:email).pluck(:email)
        puts "#{slug}: #{emails.presence&.join(', ') || '(sin consultores)'}"
      end
    end
  end
end
