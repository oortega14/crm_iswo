# frozen_string_literal: true

namespace :tenants do
  desc "Verifica que SUPER_ADMIN_TOKEN está cargado (mismo valor que debe pegarse en la UI)"
  task check_admin_token: :environment do
    token = ENV["SUPER_ADMIN_TOKEN"].to_s.strip
    if token.blank?
      abort <<~MSG
        SUPER_ADMIN_TOKEN no está definido.

        1. En api/.env añade: SUPER_ADMIN_TOKEN=dev-super-admin-iswo
        2. Reinicia: bundle exec rails server
        3. En el CRM (Onboarding tenants) pega exactamente ese valor y pulsa Guardar
      MSG
    end
    puts "OK: SUPER_ADMIN_TOKEN cargado (#{token.length} caracteres)."
    puts "    Usa el mismo valor en /settings/tenant-onboarding (header X-Admin-Token)."
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
end
