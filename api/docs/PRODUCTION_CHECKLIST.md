# Checklist de producción — RFC §7 + Kamal

Consolidado para el primer deploy. Ver también `SECURITY_FASE1.md`, `SECURITY_FASE2.md`, `SECURITY_FASE3.md`.

**Dry-run local (sin desplegar):**

```bash
cd api
bundle exec rails prod:security_dry_run
```

## 1. Repo / Kamal (`config/deploy.yml`) — ya en código

- [x] `proxy.ssl: true`, `host: iswocrm.com`
- [x] `ASSUME_SSL`, `DB_SSLMODE=require`, `APP_HOST`, `DB_RLS_ENABLED`, `SOLID_QUEUE_IN_PUMA`
- [x] `CORS_ALLOWED_ORIGINS: https://app.iswocrm.com`
- [x] Secretos listados: `RAILS_MASTER_KEY`, `CRM_ISWO_DATABASE_PASSWORD`, `DEVISE_JWT_SECRET_KEY`, `LOCKBOX_MASTER_KEY`, `BLIND_INDEX_MASTER_KEY`, `POSTMARK_API_TOKEN`
- [ ] IP/host real en `servers.web` (hoy placeholder)
- [ ] Descomentar `AWS_S3_BUCKET`, `AWS_REGION` (+ opcional `AWS_KMS_KEY_ID`) para exports en prod

## 2. Secretos (`.kamal/secrets`)

```bash
cp .kamal/secrets.example .kamal/secrets
# Editar .kamal/secrets — nunca commitear
```

- [ ] Todas las claves del ejemplo con valores reales
- [ ] `LOCKBOX_MASTER_KEY` y `BLIND_INDEX_MASTER_KEY` distintas, 64 hex cada una
- [ ] Misma `LOCKBOX_MASTER_KEY` que en dev si compartes BD (o re-cifrar PII)

## 3. TLS / landings (RFC §6.5)

- [ ] DNS `iswocrm.com` → servidor Kamal
- [ ] Wildcard o hosts extra para `{tenant}.iswocrm.com` (Cloudflare Full SSL o proxy Kamal) —
      confirmar que el dominio wildcard esté agregado y verificado si el frontend
      se sirve desde Vercel (el proxy Kamal por sí solo no cubre subdominios de tenant).

## 4. PostgreSQL — rol app + RLS

- [ ] Ejecutar `docs/sql/create_crm_iswo_app_role.sql` (password → `CRM_ISWO_DATABASE_PASSWORD`)
- [ ] `db:migrate` con usuario **owner** (no `crm_iswo`)
- [ ] En servidor: `bundle exec rails security:rls:install` && `security:rls`
- [ ] Smoke RLS con rol `crm_iswo` (conteos distintos por tenant, no como superuser)

## 5. PII (Fase 2)

- [ ] Si hay contactos legados: `CONTACT_PII_MIGRATING=true bundle exec rails security:encrypt_contacts`
- [ ] `bundle exec rails security:pii` → exit 0

## 6. Deploy y verificación

```bash
bin/kamal setup    # primera vez
bin/kamal deploy
bin/kamal app exec "bin/rails staging:preflight"
bin/kamal app exec "bin/rails security:pii"
```

- [ ] `staging:preflight` exit 0 en el contenedor
- [ ] `/up` responde 200
- [ ] Login SPA → API con cookies refresh en HTTPS

## 7. Operación (fuera del repo)

- [ ] Backups PostgreSQL cifrados
- [ ] Disco/volumen cifrado (LUKS / RDS encryption)
- [ ] Credenciales AWS IAM mínimas para bucket S3 exports
