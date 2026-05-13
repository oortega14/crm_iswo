# frozen_string_literal: true

require "csv"
require "roo"

module Contacts
  # ==========================================================================
  # Importación masiva desde CSV UTF-8 o Excel (.xlsx / .xls).
  # Columnas reconocidas (cabeceras case-insensitive; alias en español):
  #   first_name / nombre, last_name / apellido, email / correo,
  #   phone / telefono / tel, company / empresa / razon_social,
  #   position / cargo, city / ciudad, country / pais,
  #   kind / tipo (person|company|persona|empresa),
  #   notes / notas
  # ==========================================================================
  class SpreadsheetImporter
    MAX_ROWS = 2000

    Result = Struct.new(:created_count, :skipped_count, :errors, keyword_init: true)

    def initialize(tenant:, user:, io:, filename: nil)
      @tenant = tenant
      @user   = user
      @io     = io
      @filename = filename
    end

    def call
      rows, early = load_rows
      return early if early.is_a?(Result)

      errors = []
      created_count = 0
      skipped_count = 0

      if rows.size > MAX_ROWS
        return Result.new(
          created_count: 0,
          skipped_count: 0,
          errors: [{ row: 0, message: "Máximo #{MAX_ROWS} filas de datos (excl. cabecera)" }]
        )
      end

      ActsAsTenant.with_tenant(@tenant) do
        rows.each_with_index do |row, idx|
          line_no = idx + 2 # cabecera = 1
          attrs = build_attrs(normalize_row(row))
          if attrs.nil?
            skipped_count += 1
            next
          end

          contact = @tenant.contacts.new(attrs.merge(owner_user: @user))
          contact.save!
          created_count += 1
        rescue ActiveRecord::RecordInvalid => e
          errors << { row: line_no, message: e.record.errors.full_messages.join(", ") }
        rescue StandardError => e
          errors << { row: line_no, message: e.message.to_s.truncate(200) }
        end
      end

      Result.new(created_count: created_count, skipped_count: skipped_count, errors: errors)
    end

    private

    # @return [Array, Result|nil] rows array or early Result error
    def load_rows
      ext = File.extname(@filename.to_s).downcase
      case ext
      when ".csv", ".txt"
        load_csv
      when ".xlsx", ".xls"
        load_excel
      else
        [
          [],
          Result.new(
            created_count: 0,
            skipped_count: 0,
            errors: [
              {
                row:   0,
                message: "Formato no admitido#{ext.presence ? " (#{ext})" : ""}. Usa Excel (.xlsx) o CSV (.csv)."
              }
            ]
          )
        ]
      end
    end

    def load_csv
      raw = @io.read
      raw = raw.force_encoding("UTF-8")
      raw = raw.encode("UTF-8", invalid: :replace, replace: "")
      raw.sub!(/\A\uFEFF/, "") # BOM

      table = CSV.parse(raw, headers: true)
      unless table.headers&.compact_blank&.any?
        return [
          [],
          Result.new(created_count: 0, skipped_count: 0, errors: [{ row: 1, message: "Archivo sin cabeceras válidas" }])
        ]
      end

      [table.map(&:to_h), nil]
    end

    def load_excel
      path = @io.respond_to?(:path) ? @io.path : nil
      unless path.present?
        return [
          [],
          Result.new(
            created_count: 0,
            skipped_count: 0,
            errors: [{ row: 0, message: "No se pudo leer el archivo temporal para Excel." }]
          )
        ]
      end

      book = Roo::Spreadsheet.open(path)
      sheet = book.sheet(0)
      return [[], nil] unless sheet.last_row&.positive?

      headers = sheet.row(1).map { |c| c.nil? ? "" : c.to_s.strip }
      unless headers.compact_blank.any?
        return [
          [],
          Result.new(created_count: 0, skipped_count: 0, errors: [{ row: 1, message: "Hoja Excel sin cabeceras válidas" }])
        ]
      end

      rows = []
      (2..sheet.last_row).each do |i|
        vals = sheet.row(i)
        row_h = {}
        headers.each_with_index do |h, j|
          row_h[h] = vals[j] if h.present?
        end
        rows << row_h
      end

      [rows, nil]
    end

    def normalize_row(row)
      h = {}
      if row.is_a?(Hash)
        row.each do |header, val|
          next if header.blank?

          key = normalize_header_key(header)
          h[key] = val.to_s.strip.presence
        end
      else
        row.headers.each do |header|
          next if header.blank?

          key = normalize_header_key(header)
          h[key] = row[header].to_s.strip.presence
        end
      end
      h.compact
    end

    def normalize_header_key(header)
      s = header.to_s.strip.downcase
      case s
      when "nombre", "first_name", "firstname", "nombres" then "first_name"
      when "apellido", "last_name", "lastname", "apellidos" then "last_name"
      when "email", "correo", "e-mail" then "email"
      when "telefono", "teléfono", "phone", "tel", "movil", "móvil", "celular" then "phone"
      when "empresa", "company", "company_name", "razon_social", "razón_social" then "company"
      when "cargo", "position", "job_title", "puesto" then "position"
      when "ciudad", "city" then "city"
      when "pais", "país", "country" then "country"
      when "tipo", "kind", "clase" then "kind"
      when "notas", "notes", "observaciones" then "notes"
      else
        s.gsub(/\s+/, "_")
      end
    end

    def build_attrs(h)
      return nil if h.values.all?(&:blank?)

      kind = infer_kind(h)

      src =
        if (@filename.to_s.downcase.end_with?(".xlsx", ".xls"))
          @filename.present? ? "Excel: #{File.basename(@filename)}" : "Excel import"
        else
          @filename.present? ? "CSV: #{File.basename(@filename)}" : "CSV import"
        end

      attrs = {
        email:        h["email"],
        phone_e164:   h["phone"],
        city:         h["city"],
        country:      h["country"].presence || "CO",
        notes:        h["notes"],
        source_kind:  "import",
        source_label: src
      }

      if kind == "company"
        attrs[:kind] = "company"
        attrs[:company_name] = h["company"].presence
        attrs[:first_name] = nil
        attrs[:last_name] = nil
        attrs[:job_title] = h["position"].presence
      else
        attrs[:kind] = "person"
        attrs[:first_name] = h["first_name"].presence
        attrs[:last_name] = h["last_name"].presence
        attrs[:company_name] = h["company"].presence
        attrs[:job_title] = h["position"].presence
      end

      attrs.compact
    end

    def infer_kind(h)
      raw = h["kind"].to_s.downcase.strip
      return "company" if %w[company empresa organizacion organización].include?(raw)
      return "person" if %w[person persona individual contacto].include?(raw)

      return "company" if h["first_name"].blank? && h["last_name"].blank? && h["company"].present?

      "person"
    end
  end
end
