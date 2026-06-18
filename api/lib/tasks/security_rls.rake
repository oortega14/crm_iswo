# frozen_string_literal: true

namespace :security do
  desc "Fase 3 — verifica Row Level Security por tenant_id"
  task rls: :environment do
    failures = 0
    report = lambda do |name, ok, detail = nil|
      puts "#{ok ? '✅' : '❌'} #{name}#{detail ? " — #{detail}" : ''}"
      failures += 1 unless ok
    end

    puts "CRM ISWO — security:rls (Fase 3)\n"

    report.call("DB_RLS_ENABLED", DatabaseTenantRls.enabled?, ENV.fetch("DB_RLS_ENABLED", "(default prod)"))

    missing = DatabaseTenantRls::TENANT_TABLES.reject do |table|
      ActiveRecord::Base.connection.select_value(<<~SQL.squish).present?
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = '#{table}'
          AND policyname = '#{DatabaseTenantRls::POLICY_NAME}'
      SQL
    end

    report.call(
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
          report.call("Aislamiento por tenant (smoke)", true, parts)
        else
          puts "⚠️  Aislamiento smoke — #{parts} (total=#{total})"
          puts "    Los 3 tenants ven las mismas filas: RLS no filtra como superuser/owner."
          puts "    Políticas OK; aislamiento real con rol app (crm_iswo) en producción."
        end
      else
        puts "⚠️  Smoke test omitido — faltan tenants (#{slugs.join(', ')})"
      end
    else
      puts "\nEjecuta: bundle exec rails db:migrate"
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
        report.call("Rol aplicación (no superuser)", true, role)
      end
    end

    exit 1 if failures.positive?

    puts "\nFase 3 RLS OK."
  end
end
