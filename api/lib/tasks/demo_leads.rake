# frozen_string_literal: true

namespace :leads do
  desc "5 leads demo/tenant (consultores, recordatorios, duplicados)"
  task demo_pack: :environment do
    Leads::DemoPack.run!(batch_stamp: Time.current.to_i)
  end

  desc "Recordatorios + duplicados en leads demo existentes (@leads.iswo.test)"
  task demo_enrich: :environment do
    Leads::DemoEnricher.run!
  end

  desc "Leads demo completos: importar y enriquecer (pack + enrich)"
  task demo_full: %i[demo_pack demo_enrich]

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
