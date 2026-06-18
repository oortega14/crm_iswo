# Seguridad Fase 1 — Infra (tránsito + secretos)

## Checklist

```bash
cd api
bundle exec rails security:infra
```

## Qué verifica

| Item | Producción |
|------|------------|
| `force_ssl` + `ASSUME_SSL` | Obligatorio (Kamal/proxy TLS) |
| `APP_HOST` | Dominio público API |
| `DB_SSLMODE=require` | Tránsito app ↔ PostgreSQL |
| `DEVISE_JWT_SECRET_KEY` | Sesiones JWT |
| `LOCKBOX_MASTER_KEY` | Integraciones + exports + PII |
| `CORS_ALLOWED_ORIGINS` | Solo `https://`, sin localhost |

## Kamal (`config/deploy.yml`)

- `ASSUME_SSL=true`, `DB_SSLMODE=require`
- Secretos en `.kamal/secrets`: `LOCKBOX_MASTER_KEY`, `DEVISE_JWT_SECRET_KEY`

## Servidor (fuera del repo)

- TLS en proxy (Let's Encrypt / Cloudflare Full)
- Backups cifrados
- Volumen/disco cifrado en reposo (LUKS / RDS encryption)
