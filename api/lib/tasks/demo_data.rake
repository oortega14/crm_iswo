# frozen_string_literal: true

def demo_parse_wipe_slugs(raw)
  return [] if raw.to_s.strip.downcase == "none"

  slugs = raw.to_s.split(",").map { |s| s.strip.downcase }.reject(&:blank?)
  slugs.presence || Maintenance::DemoDataPurger::DEFAULT_WIPE_SLUGS
end

namespace :demo do
  desc "Purga datos demo. Por defecto vacía leads en iswo+micasita; WIPE=none solo patrones; WIPE=iswo,micasita,libranzas"
  task purge: :environment do
    wipe = demo_parse_wipe_slugs(ENV["WIPE"])
    demo_run_purge!(wipe_tenant_slugs: wipe, wipe_label: wipe.presence || "(ninguno)")
  end

  desc "Vacía contactos/oportunidades en TODOS los tenants (conserva tenants, usuarios, pipelines, landings plantilla)"
  task purge_all: :environment do
    slugs = ActsAsTenant.without_tenant { Tenant.order(:slug).pluck(:slug) }
    abort "No hay tenants en la BD." if slugs.empty?

    demo_run_purge!(wipe_tenant_slugs: slugs, wipe_label: slugs.join(", "))
  end
end

def demo_run_purge!(wipe_tenant_slugs:, wipe_label:)
  puts "\n=== Purga de datos demo ==="
  puts "Vacío operativo (todos los contactos/opps): #{wipe_label}"
  puts "Conserva: tenants, usuarios, pipelines, BANT, lead sources, red de referidos"
  puts "Landings: borra envíos y extras; restaura plantillas por vertical\n"
  Maintenance::DemoDataPurger.run!(wipe_tenant_slugs: wipe_tenant_slugs)
  puts "Listo.\n"
end
