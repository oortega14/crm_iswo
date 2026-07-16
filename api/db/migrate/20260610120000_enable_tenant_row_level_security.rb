# frozen_string_literal: true

require Rails.root.join("lib/database_tenant_rls")

# Fase 3 — Row Level Security por tenant_id (defensa en profundidad PostgreSQL).
class EnableTenantRowLevelSecurity < ActiveRecord::Migration[8.1]
  POLICY = DatabaseTenantRls::POLICY_NAME

  def up
    DatabaseTenantRls.install!
  end

  def down
    DatabaseTenantRls::TENANT_TABLES.each do |table|
      next unless table_exists?(table)

      execute "DROP POLICY IF EXISTS #{POLICY} ON #{quote_table_name(table)}"
      execute "ALTER TABLE #{quote_table_name(table)} DISABLE ROW LEVEL SECURITY"
    end
  end
end
