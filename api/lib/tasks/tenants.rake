# frozen_string_literal: true

namespace :tenants do
  desc "Crea o actualiza el tenant plataforma super-admin (onboarding de tenants)"
  task ensure_platform: :environment do
    result = Tenants::PlatformSeeder.call!
    verb = result.created ? "creado" : "actualizado"
    puts "\n=== Tenant plataforma #{verb} ==="
    puts "  slug:     #{result.tenant.slug}"
    puts "  nombre:   #{result.tenant.name}"
    puts "  admin:    #{result.admin_user.email}"
    puts "  password: Password123! (solo en registro nuevo; no se resetea si ya existía)"
    puts "\nLogin SPA: tenant=#{result.tenant.slug} email=#{result.admin_user.email}"
    puts "Onboarding: /settings/tenant-onboarding (sesión admin, sin token extra)\n"
  end

  desc <<~DESC.squish
    Crea un tenant nuevo (Tenants::Onboarder).
    Variables: SLUG, NAME, ADMIN_EMAIL (requeridas);
    ADMIN_NAME, ADMIN_PASSWORD, CURRENCY, TIMEZONE (opcionales).
    Ejemplo: SLUG=clinica NAME="Clínica X" ADMIN_EMAIL=admin@clinica.co bundle exec rails tenants:onboard
  DESC
  task onboard: :environment do
    slug         = ENV.fetch("SLUG") { abort "Falta SLUG=..." }
    name         = ENV.fetch("NAME") { abort "Falta NAME=..." }
    admin_email  = ENV.fetch("ADMIN_EMAIL") { abort "Falta ADMIN_EMAIL=..." }
    admin_name   = ENV.fetch("ADMIN_NAME", "Administrador")
    admin_pass   = ENV["ADMIN_PASSWORD"].presence || SecureRandom.hex(12)

    if Tenant.exists?(slug: slug)
      abort "Ya existe un tenant con slug=#{slug.inspect}"
    end

    result = Tenants::Onboarder.new(
      slug:           slug,
      name:           name,
      admin_email:    admin_email,
      admin_name:     admin_name,
      admin_password: admin_pass
    ).call

    puts "\n=== Tenant creado ==="
    puts "  id:       #{result.tenant.id}"
    puts "  slug:     #{result.tenant.slug}"
    puts "  nombre:   #{result.tenant.name}"
    puts "  admin:    #{result.admin_user.email}"
    puts "  password: #{admin_pass}" unless ENV["ADMIN_PASSWORD"].present?
    puts "  pipeline: #{result.pipeline.name} (id #{result.pipeline.id})"
    puts "\nLogin SPA: tenant=#{result.tenant.slug} email=#{result.admin_user.email}"
    puts "URL dev:   http://localhost:3001/login?tenant=#{result.tenant.slug}\n"
  end

  # tenants:list está en tenants_manage.rake (tabla completa)

  PROTECTED_DESTROY_SLUGS = %w[super-admin iswo micasita libranzas].freeze

  desc "Elimina un tenant y todos sus datos. Ej: SLUG=repuestera bin/rails tenants:destroy"
  task destroy: :environment do
    slug = ENV.fetch("SLUG") { abort "Falta SLUG=... (ej. SLUG=repuestera)" }

    ActsAsTenant.without_tenant do
      tenant = Tenant.find_by(slug: slug)
      abort "No existe tenant con slug=#{slug.inspect}" unless tenant

      if PROTECTED_DESTROY_SLUGS.include?(slug) && ENV["FORCE"] != "1"
        abort <<~MSG
          El tenant #{slug.inspect} está protegido (F5/plataforma).
          Si estás seguro: SLUG=#{slug} FORCE=1 bin/rails tenants:destroy
        MSG
      end

      name = tenant.name
      id   = tenant.id
      tenant.destroy!
      puts "Eliminado: #{name} (slug=#{slug}, id=#{id})"
      puts "Restantes: #{Tenant.order(:slug).pluck(:slug).join(', ')}"
    end
  end
end
