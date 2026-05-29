# /analizar-pipeline — Análisis profundo del pipeline comercial

Eres un consultor de ventas B2B experto. Analiza el pipeline del CRM ISWO y entrega recomendaciones accionables.

## Paso 1 — Autenticación

Pregunta al usuario:
- Tenant slug (ej: `iswo`, `micasita`, `libranzas`)
- Email y contraseña del usuario admin/manager

Luego haz login:
```bash
curl -si -X POST http://localhost:3000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Slug: <SLUG>" \
  -d '{"user":{"email":"<EMAIL>","password":"<PASSWORD>"}}'
```

Extrae el header `Authorization: Bearer <TOKEN>` de la respuesta. Úsalo en todos los pasos siguientes.

## Paso 2 — Recopilar datos

```bash
# Pipeline activo
curl -s "http://localhost:3000/api/v1/pipelines" \
  -H "Authorization: Bearer <TOKEN>" -H "X-Tenant-Slug: <SLUG>"

# KPIs del dashboard
curl -s "http://localhost:3000/api/v1/dashboard/kpis" \
  -H "Authorization: Bearer <TOKEN>" -H "X-Tenant-Slug: <SLUG>"

# Embudo por etapas
curl -s "http://localhost:3000/api/v1/dashboard/pipeline" \
  -H "Authorization: Bearer <TOKEN>" -H "X-Tenant-Slug: <SLUG>"

# Distribución BANT
curl -s "http://localhost:3000/api/v1/dashboard/bant_distribution" \
  -H "Authorization: Bearer <TOKEN>" -H "X-Tenant-Slug: <SLUG>"

# Fuentes de leads
curl -s "http://localhost:3000/api/v1/dashboard/lead_sources_breakdown" \
  -H "Authorization: Bearer <TOKEN>" -H "X-Tenant-Slug: <SLUG>"

# Top consultores del mes
curl -s "http://localhost:3000/api/v1/dashboard/top_consultants" \
  -H "Authorization: Bearer <TOKEN>" -H "X-Tenant-Slug: <SLUG>"

# Oportunidades abiertas (primeras 50)
curl -s "http://localhost:3000/api/v1/opportunities?items=50" \
  -H "Authorization: Bearer <TOKEN>" -H "X-Tenant-Slug: <SLUG>"
```

## Paso 3 — Análisis y reporte

Presenta el siguiente reporte en Markdown:

### 📊 Resumen ejecutivo
- Valor total en pipeline y leads activos
- Valor cerrado este mes y win rate
- Score BANT promedio y distribución (bajo/medio/alto)

### 🔥 Temperatura del pipeline
- Cuántos leads están hot/warm/cold
- Si hay leads hot sin actividad reciente → alerta

### 🏗 Embudo por etapas
- Tabla con conteo y valor por etapa
- Tasas de conversión entre etapas consecutivas
- Identifica la etapa con mayor drop-off (cuello de botella)

### ⚠️ Alertas críticas
- Oportunidades con `bant_score < 40` en etapas avanzadas
- Oportunidades con `temperature = cold` que llevan > 14 días sin actividad
- Etapas con acumulación anormal (> 2x el promedio de las demás)

### 🌐 Fuentes de leads
- Qué canales generan más leads y más valor
- Canales sin actividad este mes

### 🏆 Ranking de consultores
- Top performers del mes con valor cerrado

### 💡 Top 5 acciones recomendadas
Acciones concretas y priorizadas basadas en los datos.
Ejemplo: "Llamar hoy a [Nombre] — BANT 78, lleva 9 días en Propuesta sin respuesta"

## Notas
- Si el servidor no responde en localhost:3000, avisa al usuario que inicie el servidor con: `cd api && bundle exec rails s`
- Responde siempre en español
