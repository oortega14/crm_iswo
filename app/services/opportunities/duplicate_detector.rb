# frozen_string_literal: true

module Opportunities
  # ==========================================================================
  # Opportunities::DuplicateDetector — detecta contactos/opps similares.
  # ==========================================================================
  # Estrategia de matching (prioridad descendente):
  #   1. `phone_normalized` igualdad estricta (tras Phonelib E.164)     → score 1.0
  #   2. `email` case-insensitive igualdad estricta                      → score 0.95
  #   3. Similitud trigram de `phone_normalized` (pg_trgm % 0.6)         → score variable
  #   4. Similitud trigram de `full_name` combinada con email/phone      → score variable
  #
  # Devuelve un array de hashes: [{ contact:, score:, matched_on: }].
  # Umbral por defecto: 0.75. Ajustable vía initializer.
  # ==========================================================================
  class DuplicateDetector
    DEFAULT_THRESHOLD = 0.75

    Match = Struct.new(:contact, :score, :matched_on, keyword_init: true) do
      def as_json(*)
        {
          contact_id: contact.id,
          score:      score.round(3),
          matched_on: matched_on,
          preview: {
            first_name: contact.first_name,
            last_name:  contact.last_name,
            email:      contact.email,
            phone:      contact.phone_e164
          }
        }
      end
    end

    def initialize(phone: nil, email: nil, full_name: nil, exclude_contact_id: nil, threshold: DEFAULT_THRESHOLD)
      @phone      = phone.presence
      @email      = email.to_s.downcase.strip.presence
      @full_name  = full_name.to_s.strip.presence
      @exclude_id = exclude_contact_id
      @threshold  = threshold
    end

    def call
      raise ArgumentError, "se requiere phone, email o full_name" if @phone.nil? && @email.nil? && @full_name.nil?

      matches = []
      matches.concat(exact_phone_matches)    if @phone
      matches.concat(exact_email_matches)    if @email
      matches.concat(trigram_phone_matches)  if @phone
      matches.concat(trigram_name_matches)   if @full_name

      dedupe_and_sort(matches).select { |m| m.score >= @threshold }
    end

    # =========================================================================

    private

    def base_scope
      scope = Contact.all
      scope = scope.where.not(id: @exclude_id) if @exclude_id
      scope
    end

    def exact_phone_matches
      normalized = Phonelib.parse(@phone).sanitized
      return [] if normalized.blank?

      base_scope.where(phone_normalized: normalized).map do |c|
        Match.new(contact: c, score: 1.0, matched_on: "phone_exact")
      end
    end

    def exact_email_matches
      base_scope.where("LOWER(email) = ?", @email).map do |c|
        Match.new(contact: c, score: 0.95, matched_on: "email_exact")
      end
    end

    def trigram_phone_matches
      normalized = Phonelib.parse(@phone).sanitized
      return [] if normalized.blank?

      base_scope
        .where("similarity(phone_normalized, ?) > ?", normalized, @threshold)
        .select("contacts.*, similarity(phone_normalized, #{ActiveRecord::Base.connection.quote(normalized)}) AS sim")
        .limit(10)
        .map { |c| Match.new(contact: c, score: c[:sim].to_f, matched_on: "phone_trigram") }
    end

    def trigram_name_matches
      base_scope
        .where("similarity(full_name, ?) > ?", @full_name, @threshold)
        .select("contacts.*, similarity(full_name, #{ActiveRecord::Base.connection.quote(@full_name)}) AS sim")
        .limit(10)
        .map { |c| Match.new(contact: c, score: c[:sim].to_f * 0.9, matched_on: "name_trigram") }
    end

    # Deja un solo match por contacto, con la mejor score.
    def dedupe_and_sort(matches)
      matches
        .group_by { |m| m.contact.id }
        .map { |_id, ms| ms.max_by(&:score) }
        .sort_by { |m| -m.score }
    end
  end
end
