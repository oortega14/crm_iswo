# /resumen-diario — Briefing ejecutivo del día

Genera un resumen ejecutivo del día para un tenant del CRM ISWO.

## Paso 1 — Autenticación

Pide tenant slug, email y contraseña si no tienes token activo:

```bash
curl -si -X POST http://localhost:3000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Slug: <SLUG>" \
  -d '{"user":{"email":"<EMAIL>","password":"<PASSWORD>"}}'
```

## Paso 2 — Recopilar datos del día

```bash
# Briefing completo (hot leads, reminders vencidos, leads sin actividad)
curl -s "http://localhost:3000/api/v1/dashboard/briefing" \
  -H "Authorization: Bearer <TOKEN>" -H "X-Tenant-Slug: <SLUG>"

# KPIs generales
curl -s "http://localhost:3000/api/v1/dashboard/kpis" \
  -H "Authorization: Bearer <TOKEN>" -H "X-Tenant-Slug: <SLUG>"

# Actividad de hoy (logs y recordatorios)
curl -s "http://localhost:3000/api/v1/dashboard/activity" \
  -H "Authorization: Bearer <TOKEN>" -H "X-Tenant-Slug: <SLUG>"

# Recordatorios vencidos o de hoy
curl -s "http://localhost:3000/api/v1/reminders?status=pending&overdue=true" \
  -H "Authorization: Bearer <TOKEN>" -H "X-Tenant-Slug: <SLUG>"
```

## Paso 3 — Presentar el briefing

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📋 BRIEFING DIARIO — [TENANT] — [FECHA HOY]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 📊 KPIs del pipeline
- Oportunidades abiertas: N (valor: COP X)
- Cerradas este mes: N ganadas / N perdidas (win rate X%)
- BANT promedio: X/100
- Nuevas esta semana: N

### ⏰ Prioridades urgentes

**Recordatorios vencidos** (si hay):
- Lista cada uno con: nombre del contacto, oportunidad, cuándo venció

**Leads calientes sin actividad reciente** (si hay):
- Lista con: nombre, BANT score, días sin actividad, etapa actual

### 📅 Movimiento de hoy
- Leads nuevos ingresados hoy
- Cambios de etapa registrados
- Notas y actividad del día

### ❄️ Leads estancados (requieren seguimiento)
- Oportunidades con última actividad > 7 días

### 💡 Recomendación del día
Una acción concreta y priorizada para maximizar el valor del pipeline hoy.

---

Si no hay datos urgentes:
```
✅ Todo al día — Sin recordatorios vencidos ni leads sin seguimiento.
   Aprovecha para prospectar nuevos leads.
```

## Notas
- El briefing se basa en los permisos del usuario autenticado (consultant ve solo lo suyo)
- Responde siempre en español
- Fecha y horas en zona horaria America/Bogota
