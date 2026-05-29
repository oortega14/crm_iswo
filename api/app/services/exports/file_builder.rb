# frozen_string_literal: true

module Exports
  # ==========================================================================
  # Exports::FileBuilder — genera CSV/XLSX en disco (sync o job async).
  # ==========================================================================
  class FileBuilder
    Result = Struct.new(:path, :row_count, :filename, keyword_init: true)

    def self.build(scope:, resource:, format:, basename: "export")
      new(scope: scope, resource: resource, format: format, basename: basename).build
    end

    def initialize(scope:, resource:, format:, basename: "export")
      @scope    = scope
      @resource = resource.to_s
      @format   = format.to_s
      @basename = basename
    end

    def build
      raise ArgumentError, "Formato no soportado: #{@format}" unless Export::FORMATS.include?(@format)

      path, count = @format == "xlsx" ? build_xlsx : build_csv
      Result.new(
        path:      path,
        row_count: count,
        filename:  "#{@basename}_#{Time.current.strftime('%Y%m%d')}.#{@format}"
      )
    end

    private

    def build_xlsx
      require "caxlsx"

      path  = tmp_path("xlsx")
      pkg   = Axlsx::Package.new
      wb    = pkg.workbook
      count = 0

      wb.add_worksheet(name: @resource.titleize) do |sheet|
        headers = nil
        @scope.find_each do |r|
          headers ||= export_headers(r)
          sheet.add_row(headers) if count.zero?
          sheet.add_row(headers.map { |h| r.attributes[h] })
          count += 1
        end
        sheet.add_row(export_headers(@scope.first)) if count.zero? && @scope.none?
      end

      pkg.serialize(path)
      [path, count]
    end

    def build_csv
      require "csv"

      path    = tmp_path("csv")
      count   = 0
      headers = nil

      CSV.open(path, "w") do |csv|
        @scope.find_each do |r|
          headers ||= export_headers(r)
          csv << headers if count.zero?
          csv << headers.map { |h| r.attributes[h] }
          count += 1
        end
        csv << (headers || []) if count.zero?
      end

      [path, count]
    end

    def export_headers(record)
      record.attributes.keys.sort
    end

    def tmp_path(ext)
      dir = Rails.root.join("tmp", "exports", "sync")
      FileUtils.mkdir_p(dir)
      dir.join("#{SecureRandom.uuid}.#{ext}").to_s
    end
  end
end
