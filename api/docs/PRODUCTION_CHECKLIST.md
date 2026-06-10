# Checklist de producción — Seguridad Fase 1 + Fase 3

Consolidado de [SECURITY_FASE1.md](SECURITY_FASE1.md) (infra/tránsito/secretos) y
[SECURITY_FASE3.md](SECURITY_FASE3.md) (RLS PostgreSQL) para el primer deploy.
Fase 2 (PII) ya está activa y verificada — ver [SECURITY_FASE2.md](SECURITY_FASE2.md).

Todo lo marcado `[ ]` requiere acción manual antes o durante el deploy. Lo marcado
`[x]` ya está en el repo (Kamal `config/deploy.yml` / inicializadores).

## 1. TLS / tránsito

- [x] `ASSUME_SSL=true`, `DB_SSLMODE=require` en `config/deploy.yml` (`env.clear`)
- [ ] Descomentar y configurar el bloque `proxy:` en `config/deploy.yml`:
  ```yaml
  proxy:
    ssl: true
    host: crm.iswo.com.co
  ```
- [ ] Si los tenants usan subdominio propio para landings
  (`{tenant}.crm.iswo.com.co/{slug}`, RFC §6.5), agregar también esos hosts al
  proxy o configurar wildcard TLS (`*.crm.iswo.com.co`) en el balanceador/Cloudflare.

## 2. Secretos (`.kamal/secrets`)

- [x] `RAILS_MASTER_KEY`, `CRM_ISWO_DATABASE_PASSWORD`, `DEVISE_JWT_SECRET_KEY`,
      `LOCKBOX_MASTER_KEY`, `POSTMARK_API_TOKEN` ya listados en `env.secret`
- [ ] Agregar `BLIND_INDEX_MASTER_KEY` a `env.secret` (hoy solo cae al fallback
      derivado de `secret_key_base` si no está presente — en producción debe ser
      explícita y estable entre deploys, igual que `LOCKBOX_MASTER_KEY`)
- [ ] Confirmar que `.kamal/secrets` (fuera del repo) tiene valores reales para
      todas las claves anteriores antes del primer `kamal deploy`

## 3. CORS

- [ ] Definir `CORS_ALLOWED_ORIGINS` en `config/deploy.yml` (`env.clear`),
      ej: `https://crm.iswo.com.co,https://app.crm.iswo.com.co`
- [x] `config/initializers/cors.rb` ahora también acepta
      `https://{tenant}.{APP_HOST}` automáticamente (regex
      `tenant_production_origin`, derivado de `APP_HOST` — ya requerido por
      Fase 1). Cubre las landings públicas por subdominio (RFC §6.5) sin config
      adicional, siempre que `APP_HOST=crm.iswo.com.co` esté seteado.

## 4. Base de datos — RLS (Fase 3)

- [ ] Crear el rol de aplicación dedicado en PostgreSQL (no superuser, sin
      `BYPASSRLS`):
  ```sql
  CREATE ROLE crm_iswo WITH LOGIN PASSWORD '...' NOSUPERUSER NOBYPASSRLS;
  GRANT ALL PRIVILEGES ON DATABASE crm_iswo_production TO crm_iswo;
  ```
  (coincide con `username: crm_iswo` en `config/database.yml` producción)
- [ ] Ejecutar migraciones con un usuario **owner** (puede ser superuser/owner
      distinto de `crm_iswo`); la app en runtime usa `crm_iswo`
- [ ] `bundle exec rails db:migrate` (incluye
      `20260610120000_enable_tenant_row_level_security`)
- [ ] Setear `DB_RLS_ENABLED: "true"` en `config/deploy.yml` (`env.clear`)
- [ ] Verificar políticas: `bundle exec rails security:rls` — debe reportar las
      19 tablas con política `crm_tenant_isolation` y, con el rol `crm_iswo`
      (no superuser), el smoke test de aislamiento debe mostrar conteos
      distintos por tenant (no los 238/238/238 que se ven en dev con `postgres`)

## 5. Verificación final

- [ ] `bundle exec rails staging:preflight` — corre `security:infra` +
      `security:rls` (si `DB_RLS_ENABLED`) + checks de Postgres/Redis/Sidekiq/
      integraciones. Debe salir con exit 0 antes de considerar el deploy listo.

## 6. Fuera del repo (operación)

- [ ] Backups de PostgreSQL cifrados
- [ ] Disco/volumen cifrado en reposo (LUKS / RDS encryption / equivalente del
      proveedor)
- [ ] Confirmar que `AWS_S3_BUCKET` + `AWS_REGION` (+ opcional `AWS_KMS_KEY_ID`)
      están configurados para que `Exports::Storage` use S3+SSE en vez de
      Lockbox local (RFC §6.7)
