# frozen_string_literal: true

# Gestión de tenants desde CLI — RFC §9 (activar tenant sin modificar código).
# UI/API de onboarding: solo admin del tenant plataforma iswo + SUPER_ADMIN_TOKEN.
#
# Crear:
#   bundle exec rails tenants:create SLUG=micasita NAME="Mi Casita" ADMIN_EMAIL=admin@micasita.co
#
# Listar:
#   bundle exec rails tenants:list

namespace :tenants do
  desc "Crea un tenant nuevo con pipeline, usuario admin y campos por vertical. " \
       "SLUG= NAME= ADMIN_EMAIL= [ADMIN_NAME=] [ADMIN_PASSWORD=] [CURRENCY=COP] " \
       "[TIMEZONE=America/Bogota] [LOCALE=es-CO] [PRIMARY_COLOR=#0F172A] [LOGO_URL=]"
  task create: :environment do
    slug        = ENV.fetch("SLUG", nil)
    name        = ENV.fetch("NAME", nil)
    admin_email = ENV.fetch("ADMIN_EMAIL", nil)

    if slug.blank? || name.blank? || admin_email.blank?
      abort <<~MSG
        Error: faltan parámetros obligatorios.

        Uso:
          bundle exec rails tenants:create \\
            SLUG=micasita \\
            NAME="Mi Casita" \\
            ADMIN_EMAIL=admin@micasita.co \\
            ADMIN_NAME="Administrador"   # opcional
      MSG
    end

    admin_name     = ENV.fetch("ADMIN_NAME",     "Administrador")
    admin_password = ENV.fetch("ADMIN_PASSWORD", SecureRandom.hex(12))
    currency       = ENV.fetch("CURRENCY",       "COP")
    timezone       = ENV.fetch("TIMEZONE",       "America/Bogota")
    locale         = ENV.fetch("LOCALE",         "es-CO")
    primary_color  = ENV.fetch("PRIMARY_COLOR",  "#0F172A")
    logo_url       = ENV.fetch("LOGO_URL",       nil)

    puts "\nCreando tenant «#{name}» (#{slug})..."

    result = Tenants::Onboarder.new(
      slug:           slug.strip.downcase,
      name:           name.strip,
      admin_email:    admin_email.strip.downcase,
      admin_name:     admin_name.strip,
      admin_password: admin_password,
      currency:       currency,
      timezone:       timezone,
      locale:         locale,
      primary_color:  primary_color,
      logo_url:       logo_url.presence
    ).call

    vertical_fields = Tenants::Onboarder::VERTICAL_FIELDS[slug.strip.downcase]

    puts <<~OUT

      Tenant creado correctamente
      ─────────────────────────────────────────
        ID:           #{result.tenant.id}
        Slug:         #{result.tenant.slug}
        Nombre:       #{result.tenant.name}
        Pipeline ID:  #{result.pipeline.id}
        Etapas:       #{result.pipeline.pipeline_stages.count}
        Admin email:  #{result.admin_user.email}
        Admin nombre: #{result.admin_user.name}
        Campos extra: #{vertical_fields&.length || 0} (vertical: #{slug.strip.downcase})
      ─────────────────────────────────────────
      #{ENV["ADMIN_PASSWORD"].blank? ? "  Contrasena generada: #{admin_password}" : "  Contrasena: (la que ingresaste)"}

      Acceso al CRM: https://#{result.tenant.slug}.crm.iswo.com.co
    OUT
  end

  desc "Lista todos los tenants con su estado y número de usuarios"
  task list: :environment do
    ActsAsTenant.without_tenant do
      tenants = Tenant.kept.order(:slug)

      if tenants.none?
        puts "No hay tenants registrados."
        next
      end

      puts "\n%-5s  %-20s  %-30s  %-8s  %-10s  %s" % %w[ID Slug Nombre Activo Usuarios Creado]
      puts "-" * 95
      tenants.each do |t|
        users = User.unscoped.where(tenant_id: t.id).count
        puts "%-5d  %-20s  %-30s  %-8s  %-10d  %s" % [
          t.id,
          t.slug,
          t.name.to_s.truncate(30),
          t.active ? "si" : "no",
          users,
          t.created_at.strftime("%Y-%m-%d")
        ]
      end
      puts "\nTotal: #{tenants.size} tenant(s)\n"
    end
  end
end
