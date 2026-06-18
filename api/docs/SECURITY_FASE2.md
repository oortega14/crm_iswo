# Seguridad Fase 2 — PII cifrada (contactos)

Lockbox + blind_index en `document_id` y `phone_e164`.

## Activación

```bash
cd api
bundle exec rails db:migrate

# Si hay PII legado en claro (primera vez):
CONTACT_PII_MIGRATING=true bundle exec rails security:encrypt_contacts

# Reinicia Rails sin CONTACT_PII_MIGRATING
bundle exec rails security:sync_phone_normalized
bundle exec rails security:pii
```

## Post-migración

El modelo `Contact` usa `ignored_columns` en columnas legado y descifra vía Lockbox.

`phone_normalized` queda en claro solo para búsqueda parcial (ILIKE); teléfono y cédula van cifrados.

## Comandos

| Comando | Uso |
|---------|-----|
| `security:encrypt_contacts` | Cifra legado + limpia columnas en claro |
| `security:pii` | Verifica ciphertext y roundtrip |
| `security:sync_phone_normalized` | Rellena dígitos para búsqueda |

## Importante

- No uses `contact.update_columns(document_id: nil)` — borra ciphertext.
- Misma `LOCKBOX_MASTER_KEY` en todos los entornos que compartan BD.
- Rotación de clave requiere script de re-cifrado.
