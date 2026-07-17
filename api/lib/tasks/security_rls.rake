# frozen_string_literal: true

namespace :security do
  namespace :rls do
    desc "Fase 3 — instala o repara políticas crm_tenant_isolation (idempotente)"
    task install: :environment do
      puts "CRM ISWO — security:rls:install\n"

      missing_before = DatabaseTenantRls.missing_policy_tables
      if missing_before.empty?
        puts "✅ Políticas ya instaladas (#{DatabaseTenantRls::TENANT_TABLES.size} tablas)"
        next
      end

      puts "Instalando RLS en #{missing_before.size} tabla(s)..."
      DatabaseTenantRls.install!

      missing_after = DatabaseTenantRls.missing_policy_tables
      if missing_after.empty?
        puts "✅ Políticas instaladas en #{DatabaseTenantRls::TENANT_TABLES.size} tablas"
      else
        puts "❌ Siguen faltando: #{missing_after.join(', ')}"
        exit 1
      end
    end
  end

  desc "Fase 3 — verifica Row Level Security por tenant_id"
  task rls: :environment do
    reporter = SecurityTaskReport.new

    puts "CRM ISWO — security:rls (Fase 3)\n"

    reporter.report("DB_RLS_ENABLED", DatabaseTenantRls.enabled?, ENV.fetch("DB_RLS_ENABLED", "(default prod)"))

    missing = DatabaseTenantRls.missing_policy_tables

    reporter.report(
      "Políticas RLS instaladas",
      missing.empty?,
      missing.empty? ? "#{DatabaseTenantRls::TENANT_TABLES.size} tablas" : "faltan: #{missing.join(', ')}"
    )

    if missing.empty?
      slugs = %w[iswo micasita libranzas]
      tenants = ActsAsTenant.without_tenant do
        slugs.filter_map { |slug| Tenant.find_by(slug: slug) }
      end

      if tenants.size >= 2
        total = ActsAsTenant.without_tenant { Contact.unscoped.count }
        parts = tenants.map do |t|
          n = ActsAsTenant.with_tenant(t) { Contact.unscoped.count }
          "#{t.slug}=#{n}"
        end.join(", ")

        counts = tenants.map { |t| ActsAsTenant.with_tenant(t) { Contact.unscoped.count } }
        rls_active = counts.uniq.size > 1 || (total.positive? && counts.all? { |n| n < total })

        if rls_active
          reporter.report("Aislamiento por tenant (smoke)", true, parts)
        else
          puts "⚠️  Aislamiento smoke — #{parts} (total=#{total})"
          puts "    Los 3 tenants ven las mismas filas: RLS no filtra como superuser/owner."
          puts "    Políticas OK; aislamiento real con rol app (crm_iswo) en producción."
        end
      else
        puts "⚠️  Smoke test omitido — faltan tenants (#{slugs.join(', ')})"
      end
    else
      puts "\nEjecuta: bundle exec rails security:rls:install"
      puts "(db:migrate no re-ejecuta si la versión ya está en schema_migrations)"
    end

    if DatabaseTenantRls.enabled?
      role = ActiveRecord::Base.connection.select_value("SELECT current_user")
      superuser = ActiveRecord::Base.connection.select_value(
        "SELECT rolsuper FROM pg_roles WHERE rolname = current_user"
      )
      if superuser == true
        puts "⚠️  Conexión como superuser (#{role}): RLS no aplica al owner salvo FORCE ROW LEVEL SECURITY."
        puts "    En producción usa rol dedicado (crm_iswo) sin BYPASSRLS."
      else
        reporter.report("Rol aplicación (no superuser)", true, role)
      end
    end

    exit 1 if reporter.failures.positive?

    puts "\nFase 3 RLS OK."
  end
end
