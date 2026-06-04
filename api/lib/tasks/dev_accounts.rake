# frozen_string_literal: true

namespace :dev do
  desc "Lista tenants y usuarios de la BD actual (desarrollo)"
  task accounts: :environment do
    abort "Solo en development" unless Rails.env.development?

    db = ActiveRecord::Base.connection_db_config.database
    puts "\n=== Base de datos: #{db} (#{Rails.env}) ===\n"

    tenants = Tenant.with_discarded.order(:slug)
    if tenants.none?
      puts "No hay tenants. Ejecuta: bin/rails db:seed"
      next
    end

    puts "TENANTS (#{tenants.count}):"
    tenants.each do |t|
      user_count = User.unscoped.where(tenant_id: t.id).count
      status = []
      status << "INACTIVO" unless t.active?
      status << "DESCARTADO" if t.discarded?
      flag = status.any? ? " [#{status.join(', ')}]" : ""
      puts "  • #{t.slug.ljust(12)} #{t.name}#{flag} — #{user_count} usuario(s)"
    end

    puts "\nUSUARIOS:"
    tenants.reject(&:discarded?).each do |t|
      puts "\n--- #{t.slug} (#{t.name}) ---"
      users = User.unscoped.where(tenant_id: t.id).order(:email)
      if users.none?
        puts "  (sin usuarios)"
        next
      end
      users.each do |u|
        flags = []
        flags << "inactivo" unless u.active?
        flags << "descartado" if u.respond_to?(:discarded?) && u.discarded?
        extra = flags.any? ? " [#{flags.join(', ')}]" : ""
        puts "  #{u.email.ljust(28)} #{u.role.ljust(12)}#{extra}"
      end
    end

    puts "\nLogin (seed): slug + email + Password123!"
    puts "  iswo      → admin@iswo.local"
    puts "  micasita  → admin@micasita.local"
    puts "  libranzas → admin@libranzas.local"
    puts ""
  end
end
