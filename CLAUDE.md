# CRM ISWO — Guía de desarrollo

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

### Multi-tenancy (RFC D3)

Se resolvió usando **ambas** estrategias:
- Subdominio (`micasita.crm.iswo.com.co`) resuelto por `TenantResolver`.
- Header HTTP `X-Tenant-Slug` como fallback para clientes que no soporten subdominios.
