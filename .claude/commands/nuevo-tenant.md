# /nuevo-tenant — Crear y configurar un tenant nuevo

Crea un tenant nuevo en el CRM ISWO de forma conversacional, con pipeline, usuarios y datos iniciales.

## Paso 1 — Contexto

Pregunta al usuario:
1. **Nombre del negocio** (ej: "Clínica San Pedro")
2. **Slug único** (ej: `clinica-san-pedro`) — debe ser URL-friendly, sin espacios
3. **Vertical/industria** — ¿a qué se dedica? (inmobiliaria, crédito, consultoría, salud, etc.)
4. **Email del admin** que manejará el tenant
5. **¿Quiere datos de demo?** (contactos y oportunidades de ejemplo)

## Paso 2 — Autenticación como super-admin

Inicia sesión en el SPA como admin del tenant plataforma `super-admin`, o usa JWT + header de tenant:

```bash
# Login → extrae Bearer y usa X-Tenant-Slug: super-admin
curl -si -X POST http://localhost:3000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Slug: super-admin" \
  -d '{"user":{"email":"admin@super-admin.local","password":"Password123!"}}'
```

Crea el tenant vía API de admin (requiere sesión admin de super-admin):

```bash
curl -s -X POST http://localhost:3000/api/v1/admin/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "X-Tenant-Slug: super-admin" \
  -d '{
    "tenant": {
      "name": "<NOMBRE>",
      "slug": "<SLUG>",
      "admin_email": "<EMAIL_ADMIN>",
      "admin_name": "Administrador",
      "admin_password": "Password123!",
      "currency": "COP",
      "timezone": "America/Bogota"
    }
  }'
```

## Paso 3 — Login como admin del nuevo tenant

```bash
curl -si -X POST http://localhost:3000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Slug: <SLUG>" \
  -d '{"user":{"email":"<EMAIL_ADMIN>","password":"Password123!"}}'
```

Extrae el `Authorization: Bearer <TOKEN>`.

## Paso 4 — Configurar pipeline según la vertical

Con base en la vertical que describió el usuario, crea un pipeline apropiado. Ejemplos:

**Salud/Clínica:**
- Etapas: Consulta Inicial → Diagnóstico → Presupuesto → Aprobado → Tratamiento → Cerrado

**Educación:**
- Etapas: Interesado → Entrevista → Matrícula → Pagado → Cerrado

**Tecnología/SaaS:**
- Etapas: Demo → Propuesta → Negociación → Contrato → Implementación → Cerrado

```bash
# Actualizar el pipeline por defecto creado por el Onboarder
curl -s -X GET "http://localhost:3000/api/v1/pipelines" \
  -H "Authorization: Bearer <TOKEN>" -H "X-Tenant-Slug: <SLUG>"

# Crear etapas personalizadas según la vertical
curl -s -X POST "http://localhost:3000/api/v1/pipelines/<PIPELINE_ID>/stages" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "X-Tenant-Slug: <SLUG>" \
  -H "Content-Type: application/json" \
  -d '{"pipeline_stage": {"name": "...", "position": 0, "probability": 10, "color": "#94A3B8"}}'
```

## Paso 5 — Agregar fuentes de lead relevantes

```bash
curl -s -X POST "http://localhost:3000/api/v1/lead_sources" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "X-Tenant-Slug: <SLUG>" \
  -H "Content-Type: application/json" \
  -d '{"lead_source": {"name": "...", "kind": "web|whatsapp|meta|google|referral|manual"}}'
```

## Paso 6 — Crear usuarios adicionales (opcional)

Si el usuario quiere agregar consultores:
```bash
curl -s -X POST "http://localhost:3000/api/v1/users" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "X-Tenant-Slug: <SLUG>" \
  -H "Content-Type: application/json" \
  -d '{"user": {"name": "...", "email": "...", "password": "Password123!", "role": "consultant"}}'
```

## Paso 7 — Resumen final

Muestra:
```
✅ Tenant creado exitosamente

  Empresa:  [NOMBRE]
  URL:      http://localhost:3001 (X-Tenant-Slug: [SLUG])
  Admin:    [EMAIL] / Password123!
  Pipeline: [NOMBRE] con N etapas
  Fuentes:  N fuentes de lead configuradas

Credenciales de acceso:
  Email:      [EMAIL_ADMIN]
  Contraseña: Password123!   ← ¡Cámbiala en el primer inicio de sesión!
```

## Notas
- El Onboarder ya crea automáticamente: pipeline base, criterios BANT, lead sources genéricas
- Los pasos 4 y 5 personalizan lo creado por el Onboarder
- Responde siempre en español
