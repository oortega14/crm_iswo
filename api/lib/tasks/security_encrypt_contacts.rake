# frozen_string_literal: true

namespace :security do
  def security_sql_count(where_sql)
    DatabaseTenantRls.with_bypass do
      Contact.connection.select_value(<<~SQL.squish).to_i
        SELECT count(*) FROM contacts WHERE #{where_sql}
      SQL
    end
  end

  def legacy_document_id_count
    security_sql_count("NULLIF(TRIM(document_id), '') IS NOT NULL")
  end

  def legacy_phone_e164_count
    security_sql_count("NULLIF(TRIM(phone_e164), '') IS NOT NULL")
  end

  def legacy_pii_count
    security_sql_count(<<~SQL.squish)
      NULLIF(TRIM(document_id), '') IS NOT NULL
      OR NULLIF(TRIM(phone_e164), '') IS NOT NULL
    SQL
  end

  def encrypted_contacts_count
    security_sql_count(<<~SQL.squish)
      COALESCE(document_id_ciphertext, '') <> ''
      OR COALESCE(phone_e164_ciphertext, '') <> ''
    SQL
  end

  def phone_bidx_count
    security_sql_count("NULLIF(TRIM(phone_e164_bidx), '') IS NOT NULL")
  end

  def lockbox_key_format_ok?
    key = ENV["LOCKBOX_MASTER_KEY"].to_s.strip
    key.match?(/\A[0-9a-fA-F]{64}\z/)
  end

  def lockbox_key_label
    key = ENV["LOCKBOX_MASTER_KEY"].to_s.strip
    return "derivada (secret_key_base)" if key.blank?
    return "explícita (#{key[0, 8]}…#{key[-4, 4]})" if lockbox_key_format_ok?

    "inválida (#{key.length} chars; requiere 64 hex)"
  end

  def abort_unless_lockbox_key_valid!
    return if lockbox_key_format_ok?

    abort <<~MSG.strip
      LOCKBOX_MASTER_KEY inválida: debe ser exactamente 64 caracteres hexadecimales.

      Genera una clave válida:
        bundle exec rails runner "puts Lockbox.generate_key"

      Si los 9 contactos cifrados se crearon con la clave derivada de dev, conserva la misma clave:
        1) Comenta o borra LOCKBOX_MASTER_KEY en api/.env
        2) bundle exec rails runner "puts ENV.fetch('LOCKBOX_MASTER_KEY')"
        3) Pega ese valor en api/.env (no uses placeholders como <generada>)
    MSG
  end

  desc "Fase 2 — cifra document_id y phone_e164 existentes; limpia columnas legado en claro"
  task encrypt_contacts: :environment do
    abort_unless_lockbox_key_valid!

    ActsAsTenant.without_tenant do
      total         = Contact.unscoped.count
      legacy_before = legacy_pii_count
      cipher_before = encrypted_contacts_count

      puts "Contactos: #{total} | PII legado en claro: #{legacy_before} | Ya cifrados: #{cipher_before}"

      if legacy_before.zero? && cipher_before.zero? && total.positive?
        abort <<~MSG.strip
          No hay teléfonos/cédulas en claro ni ciphertext (#{total} contactos).
          Restaura demo: bundle exec rails leads:demo_full
        MSG
      end

      if legacy_before.positive?
        unless Contact.lockbox_attributes.values.any? { |v| v[:migrating] }
          abort <<~MSG.strip
            Hay PII legado en claro (#{legacy_before} fila(s)). Ejecuta:
              CONTACT_PII_MIGRATING=true bundle exec rails security:encrypt_contacts
            Reinicia Rails sin esa variable al terminar.
          MSG
        end

        puts "Migrando PII legado → ciphertext (Lockbox.migrate)..."
        Lockbox.migrate(Contact)
      else
        puts "Sin PII legado en columnas en claro (Lockbox ya cifra al guardar)."
      end

      cipher_after = encrypted_contacts_count
      legacy_after = legacy_pii_count

      abort "Migración no produjo ciphertext." if cipher_after.zero?

      if legacy_after.positive?
        sync_phone_normalized_from_ciphertext!
        puts "Limpiando columnas legado (#{legacy_after} fila(s))..."
        Contact.clear_legacy_pii_columns!
        legacy_after = legacy_pii_count
      end

      BlindIndex.backfill(Contact)
      sync_phone_normalized_from_ciphertext!

      puts "✅ #{cipher_after} contacto(s) con ciphertext"
      puts "📋 PII legado restante: #{legacy_after}"
      puts "Verifica: bundle exec rails security:pii"
    end
  end

  desc "Fase 2 — verifica cifrado PII en contacts"
  task pii: :environment do
    failures = 0
    legacy_pending = false

    report = lambda do |name, ok, detail = nil|
      puts "#{ok ? '✅' : '❌'} #{name}#{detail ? " — #{detail}" : ''}"
      failures += 1 unless ok
    end

    puts "CRM ISWO — security:pii (Fase 2)\n"

    report.call("LOCKBOX_MASTER_KEY", lockbox_key_format_ok?, lockbox_key_label)
    report.call(
      "BLIND_INDEX_MASTER_KEY",
      ENV["BLIND_INDEX_MASTER_KEY"].present? || lockbox_key_format_ok?,
      ENV["BLIND_INDEX_MASTER_KEY"].present? ? "explícita" : lockbox_key_label
    )

    unless lockbox_key_format_ok?
      puts "\nCorrige LOCKBOX_MASTER_KEY en api/.env y vuelve a ejecutar security:pii."
      exit 1
    end

    ActsAsTenant.without_tenant do
      with_legacy_doc   = legacy_document_id_count
      with_legacy_phone = legacy_phone_e164_count
      legacy_pending    = with_legacy_doc.positive? || with_legacy_phone.positive?
      with_ciphertext   = encrypted_contacts_count
      with_phone_bidx   = phone_bidx_count
      total             = Contact.unscoped.count

      report.call("Sin document_id en claro", with_legacy_doc.zero?, "#{with_legacy_doc} pendientes")
      report.call("Sin phone_e164 en claro", with_legacy_phone.zero?, "#{with_legacy_phone} pendientes")
      report.call(
        "Contactos con ciphertext",
        with_ciphertext.positive? || total.zero?,
        "#{with_ciphertext} cifrado(s)"
      )
      report.call(
        "Blind index teléfono",
        with_phone_bidx.positive? || with_ciphertext.zero?,
        "#{with_phone_bidx} índice(s)"
      )

      orphan_bidx = with_phone_bidx - with_ciphertext
      if orphan_bidx.positive? && with_legacy_phone.zero?
        puts "⚠️  #{orphan_bidx} blind index huérfano(s) (encrypt fallido previo; no afecta roundtrip)"
      end

      with_phone_cipher = Contact.unscoped.where("COALESCE(phone_e164_ciphertext, '') <> ''")
      if with_phone_cipher.exists?
        ok = nil
        begin
          ok = with_phone_cipher.find { |c| c.phone_e164.present? }
        rescue Lockbox::Error => e
          report.call("Roundtrip phone_e164", false, e.message.truncate(120))
          ok = :failed
        end
        unless ok == :failed
          report.call(
            "Roundtrip phone_e164",
            ok.present?,
            ok ? ok.phone_e164.to_s.truncate(20) : "0 descifrables (clave distinta a la del cifrado)"
          )
        end
      end
    end

    if failures.positive?
      if legacy_pending
        puts "\nEjecuta: CONTACT_PII_MIGRATING=true bundle exec rails security:encrypt_contacts"
      end
      exit 1
    end

    puts "\nFase 2 PII OK."
  end

  desc "Fase 2 — rellena phone_normalized desde teléfonos cifrados"
  task sync_phone_normalized: :environment do
    ActsAsTenant.without_tenant { sync_phone_normalized_from_ciphertext! }
  end

  desc "Fase 2 — repara blind index huérfano (bidx sin ciphertext) desde phone_normalized"
  task repair_orphan_bidx: :environment do
    abort_unless_lockbox_key_valid!

    repaired = 0
    cleared  = 0

    ActsAsTenant.without_tenant do
      scope = Contact.unscoped.where(<<~SQL.squish)
        NULLIF(TRIM(phone_e164_bidx), '') IS NOT NULL
        AND COALESCE(phone_e164_ciphertext, '') = ''
      SQL

      scope.find_each do |contact|
        norm = contact.read_attribute(:phone_normalized)
        if norm.blank?
          Contact.unscoped.where(id: contact.id).update_all(
            phone_e164_bidx: nil, updated_at: Time.current
          )
          cleared += 1
          next
        end

        parsed = Phonelib.parse(norm.start_with?("+") ? norm : "+#{norm}", "CO")
        parsed = Phonelib.parse(norm, "CO") unless parsed.valid?

        unless parsed.valid?
          Contact.unscoped.where(id: contact.id).update_all(
            phone_e164_bidx: nil, updated_at: Time.current
          )
          cleared += 1
          next
        end

        contact.phone_e164 = parsed.e164
        contact.phone_normalized = parsed.sanitized
        contact.save!
        repaired += 1
      rescue StandardError => e
        Rails.logger.warn("[repair_orphan_bidx] contact=#{contact.id} #{e.class}: #{e.message}")
        Contact.unscoped.where(id: contact.id).update_all(
          phone_e164_bidx: nil, updated_at: Time.current
        )
        cleared += 1
      end

      BlindIndex.backfill(Contact)
    end

    puts "✅ Reparados con ciphertext: #{repaired}"
    puts "🧹 Índices huérfanos limpiados: #{cleared}"
    puts "Verifica: bundle exec rails security:pii"
  end

  def decrypted_phone_e164(contact)
    phone = contact.phone_e164.presence
    return phone if phone.present?

    ct = contact.read_attribute(:phone_e164_ciphertext)
    return nil if ct.blank?

    Contact.decrypt_phone_e164_ciphertext(ct, context: contact)
  rescue Lockbox::DecryptionError
    nil
  end

  def sync_phone_normalized_from_ciphertext!
    updated = 0
    Contact.unscoped.find_each do |contact|
      phone = decrypted_phone_e164(contact)
      norm  = phone.present? ? Contact.normalize_phone_digits(phone) : nil
      current = contact.read_attribute(:phone_normalized)
      next if norm == current || (norm.blank? && current.blank?)

      Contact.unscoped.where(id: contact.id).update_all(phone_normalized: norm, updated_at: Time.current)
      updated += 1
    end
    puts "✅ phone_normalized sincronizado en #{updated} contacto(s)"
  end
end
