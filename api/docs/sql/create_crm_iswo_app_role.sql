-- Rol de aplicación CRM ISWO (Fase 3 RLS — SECURITY_FASE3.md)
-- Ejecutar como superuser/owner en PostgreSQL de producción.
-- La app usa username crm_iswo (config/database.yml production).

-- 1) Rol sin superuser ni bypass RLS
CREATE ROLE crm_iswo WITH LOGIN PASSWORD 'CAMBIAR_PASSWORD_FUERTE' NOSUPERUSER NOBYPASSRLS;

-- 2) Bases (ajusta nombres si difieren)
GRANT CONNECT ON DATABASE crm_iswo_production TO crm_iswo;
GRANT CONNECT ON DATABASE crm_iswo_production_cache TO crm_iswo;
GRANT CONNECT ON DATABASE crm_iswo_production_queue TO crm_iswo;
GRANT CONNECT ON DATABASE crm_iswo_production_cable TO crm_iswo;

-- 3) En cada BD, conectar y ejecutar (repetir por crm_iswo_production, _cache, _queue, _cable):
-- \c crm_iswo_production
GRANT USAGE ON SCHEMA public TO crm_iswo;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO crm_iswo;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO crm_iswo;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO crm_iswo;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO crm_iswo;

-- 4) Migraciones: ejecutar db:migrate con usuario owner (postgres), no con crm_iswo.
-- 5) Verificar desde la app: bundle exec rails security:rls
