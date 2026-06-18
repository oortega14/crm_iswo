# frozen_string_literal: true

namespace :landings do
  desc "Sembra landings demo ISO en ISWO (2 publicadas + 1 borrador)"
  task seed_iswo: :environment do
    tenant = Tenant.find_by!(slug: "iswo")
    ActsAsTenant.with_tenant(tenant) { Landings::TenantSetup.apply!(tenant) }
    puts "ISWO — landings consultoría ISO:"
    LandingPage.where(tenant: tenant).order(:slug).each do |lp|
      status = lp.published? ? "publicada" : "borrador"
      puts "  [#{status}] #{lp.title} → #{lp.public_url}"
    end
  end

  desc "Sembra landings demo Pasto en Mi Casita (2 publicadas + 1 borrador)"
  task seed_micasita_pasto: :environment do
    tenant = Tenant.find_by!(slug: "micasita")
    ActsAsTenant.with_tenant(tenant) { Landings::TenantSetup.apply!(tenant) }
    puts "Mi Casita — landings Pasto:"
    LandingPage.where(tenant: tenant).order(:slug).each do |lp|
      status = lp.published? ? "publicada" : "borrador"
      puts "  [#{status}] #{lp.title} → #{lp.public_url}"
    end
  end

  desc "Sembra landings demo en Libranzas (2 publicadas + 1 borrador)"
  task seed_libranzas: :environment do
    tenant = Tenant.find_by!(slug: "libranzas")
    ActsAsTenant.with_tenant(tenant) { Landings::TenantSetup.apply!(tenant) }
    puts "Libranzas — landings crédito por nómina:"
    LandingPage.where(tenant: tenant).order(:slug).each do |lp|
      status = lp.published? ? "publicada" : "borrador"
      puts "  [#{status}] #{lp.title} → #{lp.public_url}"
    end
  end

  desc "Sincroniza landings por tenant (F5: 3 plantillas c/u; otros: genéricas)"
  task sync: :environment do
    cfg = ActiveRecord::Base.connection_db_config
    puts "Sincronizando landings en DB #{cfg.database} @ #{cfg.host || 'localhost'}..."
    ActsAsTenant.without_tenant do
      Tenant.find_each do |tenant|
        ActsAsTenant.with_tenant(tenant) do
          Landings::TenantSetup.apply!(tenant)
          slugs = LandingPage.where(tenant: tenant).pluck(:slug).join(", ")
          puts "  → #{tenant.slug}: #{slugs.presence || '(ninguna)'}"
        end
      end
    end
    puts "Listo."
  end

  desc "Reprocesa envíos de landing sin oportunidad (todos los tenants)"
  task reprocess_pending: :environment do
    scope = LandingFormSubmission.where(opportunity_id: nil)
    puts "Reprocesando #{scope.count} envío(s) pendientes..."
    scope.find_each do |submission|
      ActsAsTenant.with_tenant(submission.tenant) do
        ok = LandingSubmissionProcessor.new(submission).call
        submission.reload
        status = ok ? "OK opp=#{submission.opportunity_id}" : "FAIL #{submission.process_error}"
        puts "  submission=#{submission.id} tenant=#{submission.tenant.slug} #{status}"
      end
    end
  end

  desc "Muestra conteo de landings por tenant"
  task verify: :environment do
    cfg = ActiveRecord::Base.connection_db_config
    puts "DB: #{cfg.database} @ #{cfg.host || 'localhost'}"
    ActsAsTenant.without_tenant do
      Tenant.order(:slug).find_each do |tenant|
        n = LandingPage.where(tenant: tenant).count
        slugs = LandingPage.where(tenant: tenant).order(:slug).pluck(:slug).join(", ")
        pending = LandingFormSubmission.where(tenant: tenant, opportunity_id: nil).count
        puts "  #{tenant.slug}: #{n} landing(s) — #{slugs.presence || '(ninguna)'} — #{pending} envío(s) sin opp"
      end
    end
  end

  task setup_all: :sync
end
