# frozen_string_literal: true

namespace :landings do
  desc "Sincroniza landings: F5 (iswo/micasita/libranzas) sin plantillas; otros tenants con genéricas opcionales"
  task sync: :environment do
    cfg = ActiveRecord::Base.connection_db_config
    puts "Sincronizando landings en DB #{cfg.database} @ #{cfg.host || 'localhost'}..."
    puts "Verticales F5 sin plantillas: #{Landings::TenantSetup::VERTICAL_SEED_SLUGS.join(', ')}"
    ActsAsTenant.without_tenant do
      Tenant.find_each do |tenant|
        ActsAsTenant.with_tenant(tenant) do
          Landings::TenantSetup.apply!(tenant)
          slugs = LandingPage.where(tenant: tenant).pluck(:slug).join(", ")
          puts "  → #{tenant.slug}: #{slugs}"
        end
      end
    end
    puts "Listo."
  end

  desc "Muestra conteo de landings por tenant (comparar con lo que ve el CRM)"
  task verify: :environment do
    cfg = ActiveRecord::Base.connection_db_config
    puts "DB: #{cfg.database} @ #{cfg.host || 'localhost'}"
    ActsAsTenant.without_tenant do
      Tenant.order(:slug).find_each do |tenant|
        n = LandingPage.where(tenant: tenant).count
        slugs = LandingPage.where(tenant: tenant).order(:slug).pluck(:slug).join(", ")
        puts "  #{tenant.slug}: #{n} — #{slugs.presence || '(ninguna)'}"
      end
    end
  end

  task setup_all: :sync
end
