# CRM ISWO — Guía de desarrollo

## Comandos interactivos (Claude Code)

| Comando | Qué hace |
|---|---|
| `/analizar-pipeline` | Análisis profundo del pipeline con BANT, temperaturas, cuellos de botella y recomendaciones |
| `/agregar-lead` | Agregar un lead conversacionalmente — describe al prospecto y se crea contacto + oportunidad |
| `/resumen-diario` | Briefing ejecutivo del día: recordatorios vencidos, leads calientes, movimiento de hoy |
| `/diagnostico` | Verificar que Rails, Vite, PostgreSQL, Redis y Sidekiq estén funcionando |
| `/nuevo-tenant` | Crear y configurar un tenant nuevo con pipeline y usuarios según su vertical |

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

`app/controllers/concerns/auditable.rb` incluido en `BaseController`. Registra
`create`, `update` y `destroy` automáticamente en `AuditEvent` para todas las
entidades, sin tocar cada controlador individualmente.

**Cómo funciona:**
- `after_action` solo dispara en respuestas 2xx — los errores no se auditan.
- Detecta el record por convención (`controller_name.singularize` → `@contact`,
  `@user`, `@lead_source`, etc.).
- Controladores con ivar no convencional declaran `auditable_resource :nombre`:
  `PipelineStages→:stage`, `LandingPages→:landing`, `BantCriteria→:criterion`,
  `ReferralNetworks→:edge`, `TenantFieldDefinitions→:definition`.
- Campos sensibles (`email`, `phone`, `credentials`, etc.) se redactan como
  `[REDACTED]` en el diff de updates.
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
