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
    puts "\n=== Purga de datos demo ==="
    puts "Vacío operativo (todos los contactos/opps): #{wipe.presence || '(ninguno)'}"
    puts "Landings: borra envíos demo y extras (F5 iswo/micasita/libranzas quedan sin plantillas)\n"
    puts "Patrones demo en otros tenants: sí\n"
    Maintenance::DemoDataPurger.run!(wipe_tenant_slugs: wipe)
    puts "Listo.\n"
  end
end
