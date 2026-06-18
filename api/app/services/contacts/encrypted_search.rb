# frozen_string_literal: true

module Contacts
  # Búsqueda en listados / ⌘K cuando document_id y phone_e164 están cifrados.
  module EncryptedSearch
    module_function

    def apply(scope, query)
      q = query.to_s.strip
      return scope if q.blank?

      like = "%#{ActiveRecord::Base.sanitize_sql_like(q)}%"
      scopes = [
        scope.where(
          "first_name ILIKE :like OR last_name ILIKE :like OR company_name ILIKE :like OR email ILIKE :like",
          like: like
        )
      ]

      phone = resolve_e164(q)
      scopes << scope.where(phone_e164: phone) if phone.present?

      doc = normalize_document(q)
      scopes << scope.where(document_id: doc) if doc.present?

      ids = scopes.flat_map { |s| s.pluck(:id) }.uniq
      scope.where(id: ids)
    end

    def resolve_e164(raw)
      parsed = Phonelib.parse(raw)
      return parsed.e164 if parsed.valid?

      digits = raw.to_s.gsub(/\D/, "")
      return nil if digits.length < 7

      Phonelib.parse(digits, "CO").e164.presence
    end

    def normalize_document(raw)
      doc = raw.to_s.strip.gsub(/[.\s-]/, "")
      doc.match?(/\A\d{6,}\z/) ? doc : nil
    end
  end
end
