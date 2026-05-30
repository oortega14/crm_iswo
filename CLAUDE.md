# CRM ISWO — Guía de desarrollo

## Comandos interactivos (Claude Code)

| Comando | Qué hace |
|---|---|
| `/analizar-pipeline` | Análisis profundo del pipeline con BANT, temperaturas, cuellos de botella y recomendaciones |
| `/agregar-lead` | Agregar un lead conversacionalmente — describe al prospecto y se crea contacto + oportunidad |
| `/resumen-diario` | Briefing ejecutivo del día: recordatorios vencidos, leads calientes, movimiento de hoy |
| `/diagnostico` | Verificar que Rails, Vite, PostgreSQL, Redis y Sidekiq estén funcionando |
| `/nuevo-tenant` | Crear y configurar un tenant nuevo con pipeline y usuarios según su vertical |

**Staging (RFC §9):** `cd api && bundle exec rails staging:preflight` — checklist pre-producción (infra, Sidekiq, integraciones).

Todos los comandos requieren que el servidor Rails esté corriendo en `localhost:3000`.

---

## Decisiones de arquitectura

### AiClassifier — clasificación de temperatura (RFC §3.2)

`api/app/services/opportunities/ai_classifier.rb` usa Claude Haiku para clasificar
la temperatura de un lead (`cold` / `warm` / `hot`) con un razonamiento y una
sugerencia de siguiente acción.

**El RFC §3.2 pone "IA predictiva para scoring automático de leads" fuera del MVP.**
Esta feature **no viola** esa restricción porque:

- Es **manual**: el consultor activa explícitamente `POST /api/v1/opportunities/:id/classify`.
- No sustituye el scoring BANT (que es el único scoring automático del sistema).
- Clasifica temperatura, no calificación BANT — son dos dimensiones distintas.
- Si `ANTHROPIC_API_KEY` no está configurada, cae a reglas deterministas sin IA.

En el historial de actividad el log queda con `action: "classify"`, distinguible
de los cambios de etapa o de score BANT.

---

### Auto-avance a etapa "Calificada" (RFC §6.1)

`BantScorer#call_and_persist!` avanza automáticamente la oportunidad a la etapa
"Calificada" cuando el score BANT supera el umbral por primera vez.

Condiciones para que el avance ocurra:
1. La oportunidad tenía `qualified: false` antes del recálculo.
2. Existe una etapa llamada `"calificada"` (case-insensitive) en el pipeline.
3. La etapa actual no es terminal (won/lost).
4. La etapa actual tiene posición menor a "Calificada" (no retrocede).

El log queda en `opportunity_logs` con `note: "Avance automático por calificación BANT"`.

---

### Campos personalizados por vertical (RFC F5)

`TenantFieldDefinition` permite definir campos extra por tenant sin modificar
el esquema central. Los valores se guardan en `custom_fields` (JSONB) de
`opportunities` y `contacts`.

`Tenants::Onboarder` siembra los campos automáticamente según el slug:
- `"libranzas"` → 8 campos (empleador, NIT, tipo, salario, plazo, cuota, descuento, entidad)
- `"micasita"` / `"mi_casita"` → 7 campos (tipo inmueble, estrato, ciudad, barrio, valor, crédito hipotecario, área)

Los admins pueden gestionar campos desde **Settings → Campos** sin deploy.

---

### Audit log 100% CRUD (RFC §9)

`app/services/audit_logger.rb` centraliza la persistencia en `AuditEvent` con
`LogSanitizer` aplicado a toda la metadata. Los controladores y concerns llaman
a `AuditLogger.record!` / `record_entity!` en lugar de `AuditEvent.create!`
directo.

`app/controllers/concerns/auditable.rb` incluido en `BaseController`. Registra
`create`, `update` y `destroy` automáticamente en `AuditEvent` para todas las
entidades, sin tocar cada controlador individualmente.

**Cómo funciona:**
- `after_action` solo dispara en respuestas 2xx — los errores no se auditan.
- Detecta el record por convención (`controller_name.singularize` → `@contact`,
  `@user`, `@lead_source`, etc.).
- Tras un `create` exitoso el ivar debe estar asignado (`@reminder = reminder`)
  antes del render — si no, el `after_action` no encuentra el record.
- Controladores con ivar no convencional declaran `auditable_resource :nombre`:
  `PipelineStages→:stage`, `LandingPages→:landing`, `BantCriteria→:criterion`,
  `ReferralNetworks→:edge`, `TenantFieldDefinitions→:definition`.
- Campos sensibles (`email`, `phone`, `credentials`, etc.) se redactan como
  `[REDACTED]` en el diff de updates (clave completa, vía `LogSanitizer`).
- Falla silenciosamente (`rescue StandardError` + `logger.warn`) — nunca tumba
  la petición HTTP.

**Controladores excluidos** (tienen auditoría propia o son de solo lectura):
`opportunities` (usa `opportunity_logs`), `sessions`, `ad_integrations`,
`exports`, `dashboard`, `searches`, `notifications`, `audit_events`.

**Sistema de auditoría dual:**
- `opportunity_logs` — trazabilidad comercial detallada de oportunidades
  (stage_change, assign, merge, BANT, classify, notas).
- `audit_events` — CRUD de todas las demás entidades + eventos de sistema
  (login, import, integraciones).

---

### Multi-tenancy (RFC D3)

Se resolvió usando **ambas** estrategias:
- Subdominio (`micasita.crm.iswo.com.co`) resuelto por `TenantResolver`.
- Header HTTP `X-Tenant-Slug` como fallback para clientes que no soporten subdominios.

---

### Admin UI — React SPA en lugar de Slim (RFC §5)

El RFC §5 propone **React** para la app principal y **Slim (SSR en Rails)** para
módulos admin internos. En la implementación se adoptó **frontend único en React**
para todo el producto, incluida la administración por tenant.

**Decisión:** Slim **descartado** a favor de la SPA en `client/`. Rails corre como
**API-only** (`config.api_only = true`); no hay vistas `.slim` ni asset pipeline
de admin en el backend.

**Cobertura funcional del RFC (admin):** equivalente vía React + `/api/v1`, con
RBAC Pundit y la misma sesión JWT que el resto del CRM:

| Módulo admin RFC | Ruta SPA |
|------------------|----------|
| Pipelines / etapas | `/settings/pipelines` |
| BANT / stale days | `/settings/bant` |
| Campos por tenant | `/settings/fields` |
| Usuarios | `/settings/users` |
| Integraciones (Meta, Google, WhatsApp) | `/settings/integrations` |
| Lead sources | `/settings/lead-sources` |
| Landings + GrapeJS | `/landings` |
| Exportaciones | `/exports` |
| Duplicados | `/duplicates` |
| Auditoría | `/settings/audit` |
| Onboarding de tenants | `/settings/tenant-onboarding` |

**Excepción operativa (no producto):** Sidekiq Web en `/sidekiq` — UI HTML propia
del gem, protegida con HTTP Basic en producción.

**Por qué no implementar Slim:** evita duplicar pantallas, auth y permisos;
alinea el producto con referentes HubSpot/GoHighLevel (una sola app web); el MVP
exige *vistas admin*, no *Slim* como tecnología obligatoria.

**Conformidad RFC:** desviación **documentada** — actualizar RFC-001 §5 en una
revisión de producto si se requiere cumplimiento literal del stack tabulado.

---

### Recordatorios — entrega antes de marcar `sent` (RFC §6.4)

`ReminderNotificationJob` solo marca `status=sent` **después** de confirmar entrega:

| Canal | Comportamiento |
|-------|----------------|
| **email** | `ReminderMailer#deliver_now` — si falla, `mark_failed!` |
| **whatsapp** | `WhatsappDeliveryJob` recibe `reminder_id` y marca sent/failed según el estado del `WhatsappMessage` |
| **in_app** | Crea `Notification` primero; si falla la creación, no marca sent |

---

### Notificaciones in-app (RFC §6.4)

El RFC menciona push in-app; la implementación MVP usa **polling** en
`NotificationDropdown` (15s + `refetchOnWindowFocus`). No hay WebSocket/ActionCable
aún — desviación aceptada para MVP; latencia máxima ~15s visible para el usuario.

---

### Enmascaramiento en logs (ISO A.8.11)

`LogSanitizer.redact` enmascara email, teléfonos y credenciales en
`opportunity_logs.changes_data`. `Auditable` y `AuditLogger` redactan metadata
sensible en `audit_events`.

---

### Exportaciones — cifrado en reposo (RFC §6.7 / ISO A.7.10)

`Exports::Storage` centraliza la persistencia de archivos async:

| Entorno | Almacenamiento | Acceso |
|---------|----------------|--------|
| **Producción** | S3 privado + SSE (`AES256` o `aws:kms` con `AWS_KMS_KEY_ID`) | Presigned URL **bajo demanda** (15 min) vía `GET /exports/:id/download` |
| **Desarrollo** | `storage/exports/` cifrado con **Lockbox** (`.enc`) | Solo endpoint autenticado; descifra en memoria |

- `file_url` en DB guarda referencia interna (`s3://…` o `local://encrypted`), no URLs públicas.
- `ExportSerializer` siempre expone `/api/v1/exports/:id/download` al SPA.
- `CleanupExportsJob` borra objetos S3 y archivos `.enc` al expirar (7 días).
- Export sync (`ExportDownloadable`) sigue siendo stream directo sin persistir disco.

Variables: `AWS_S3_BUCKET`, `AWS_REGION`, opcional `AWS_KMS_KEY_ID`, `LOCKBOX_MASTER_KEY`.
