# /diagnostico — Estado del sistema CRM ISWO

Verifica que todos los componentes del CRM estén funcionando correctamente.

## Verificaciones

### 1. Rails API
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/up
```
✅ Esperado: `200` con fondo verde  
❌ Si falla: `cd api && bundle exec rails s -p 3000 -b 0.0.0.0`

### 2. Frontend Vite
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001
```
✅ Esperado: `200`  
❌ Si falla: `cd client && npm run dev`

### 3. PostgreSQL — base de datos de desarrollo
```bash
psql postgres://postgres:postgres@localhost:5432/crm_iswo_development \
  -c "SELECT count(*) FROM tenants;" 2>&1
```
✅ Esperado: número >= 1  
❌ Si falla: verificar que PostgreSQL está corriendo

### 4. Base de datos de test (separada de dev)
```bash
psql postgres://postgres:postgres@localhost:5432/crm_iswo_test \
  -c "SELECT 'ok';" 2>&1
```
✅ Esperado: `ok`  
❌ Si falla: `cd api && RAILS_ENV=test bundle exec rails db:create db:migrate`

### 5. Redis
```bash
redis-cli ping 2>&1
```
✅ Esperado: `PONG`  
❌ Si falla: `redis-server --daemonize yes`

### 6. Sidekiq (jobs en background)
```bash
redis-cli llen queue:default 2>&1
redis-cli llen queue:critical 2>&1
```
Muestra las colas pendientes. Si hay miles de jobs acumulados, Sidekiq no está corriendo.

### 7. Suite de tests
```bash
cd api && bundle exec rspec --format progress 2>&1 | tail -5
```
✅ Esperado: `X examples, 0 failures`

### 8. TypeScript del frontend
```bash
cd client && npx tsc --noEmit 2>&1
```
✅ Esperado: sin output (sin errores)

### 9. Tenants activos en la BD
```bash
psql postgres://postgres:postgres@localhost:5432/crm_iswo_development \
  -c "SELECT slug, name, active, (SELECT count(*) FROM users WHERE tenant_id=tenants.id) AS usuarios FROM tenants ORDER BY id;" 2>&1
```

### 10. Variables de entorno críticas
```bash
cd api && grep -E "^(DEVISE_JWT|LOCKBOX|ANTHROPIC_API_KEY|POSTMARK)" .env
```
Informa cuáles están vacías (no es error, pero el usuario debe saberlo).

## Reporte final

Presenta un resumen con:
- ✅/❌ para cada componente
- Si algo falla: el comando exacto para arreglarlo
- Tiempo de respuesta de la API (del paso 1)
- Versión de Ruby: `ruby --version`
- Versión de Node: `node --version`

## Notas
- Este comando es para desarrolladores/admins, no usuarios finales
- No exponer passwords ni tokens en el reporte
