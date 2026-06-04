# frozen_string_literal: true

module Exports
  # ============================================================================
  # Storage — persistencia segura de archivos export (ISO A.7.10)
  # ============================================================================
  # Producción: S3 privado + SSE + presigned URL bajo demanda (no en DB).
  # Desarrollo: Lockbox (AES-256-GCM) en storage/exports/ fuera de public/.
  # ============================================================================
  module Storage
    LOCAL_MARKER   = "local://encrypted"
    S3_URI_PREFIX  = "s3://"
    PRESIGN_TTL    = 15.minutes

    module_function

    def persist!(export, plaintext_path)
      if s3_enabled?
        key = object_key(export)
        upload_to_s3!(plaintext_path, key)
        "#{S3_URI_PREFIX}#{key}"
      else
        write_encrypted!(export, plaintext_path)
        LOCAL_MARKER
      end
    end

    def download_payload(export)
      ref = export.file_url.to_s

      if ref.start_with?(S3_URI_PREFIX)
        url = presigned_url(ref.delete_prefix(S3_URI_PREFIX))
        return { type: :redirect, url: url } if url.present?
      elsif ref.start_with?("https://")
        return { type: :redirect, url: ref }
      end

      if encrypted_file?(export)
        {
          type:        :data,
          data:        decrypt_file!(export),
          filename:    download_filename(export),
          content_type: mime_for(export.format)
        }
      elsif (path = plain_storage_path(export)) && File.exist?(path)
        {
          type:         :file,
          path:         path,
          filename:     download_filename(export),
          content_type: mime_for(export.format)
        }
      elsif (legacy = legacy_public_path(export)) && File.exist?(legacy)
        {
          type:         :file,
          path:         legacy,
          filename:     download_filename(export),
          content_type: mime_for(export.format)
        }
      end
    end

    def delete!(export)
      [encrypted_path(export), plain_storage_path(export), legacy_public_path(export)].each do |path|
        File.delete(path) if path && File.exist?(path)
      end

      delete_from_s3!(export) if s3_enabled?
    end

    def object_key(export)
      "exports/#{export.tenant_id}/#{export.id}.#{export.format}"
    end

    def s3_enabled?
      ENV["AWS_S3_BUCKET"].present? && defined?(Aws::S3::Resource)
    end

    def encrypted_path(export)
      Rails.root.join("storage", "exports", export.tenant_id.to_s,
                      "#{export.id}.#{export.format}.enc").to_s
    end

    def plain_storage_path(export)
      Rails.root.join("storage", "exports", export.tenant_id.to_s,
                      "#{export.id}.#{export.format}").to_s
    end

    def legacy_public_path(export)
      Rails.root.join("public", "exports", export.tenant_id.to_s,
                      "#{export.id}.#{export.format}").to_s
    end

    def encrypted_file?(export)
      File.exist?(encrypted_path(export))
    end

    def write_encrypted!(export, plaintext_path)
      FileUtils.mkdir_p(File.dirname(encrypted_path(export)))
      ciphertext = lockbox.encrypt(File.binread(plaintext_path))
      File.binwrite(encrypted_path(export), ciphertext)
    end

    def decrypt_file!(export)
      lockbox.decrypt(File.binread(encrypted_path(export)))
    end

    def lockbox
      key = Lockbox.master_key
      raise ArgumentError, "LOCKBOX_MASTER_KEY required for export encryption" if key.blank?

      Lockbox.new(key: key)
    end

    def upload_to_s3!(path, key)
      opts = { acl: "private", server_side_encryption: "AES256" }
      kms_key = ENV["AWS_KMS_KEY_ID"].presence
      opts[:server_side_encryption] = "aws:kms" if kms_key
      opts[:ssekms_key_id] = kms_key if kms_key

      s3_bucket.object(key).upload_file(path, **opts)
    end

    def presigned_url(key)
      s3_bucket.object(key).presigned_url(:get, expires_in: PRESIGN_TTL.to_i)
    end

    def delete_from_s3!(export)
      key = if export.file_url.to_s.start_with?(S3_URI_PREFIX)
              export.file_url.delete_prefix(S3_URI_PREFIX)
            else
              object_key(export)
            end
      s3_bucket.object(key).delete
    rescue StandardError => e
      Rails.logger.warn("[Exports::Storage] S3 delete #{key}: #{e.message}")
    end

    def s3_bucket
      @s3_bucket ||= Aws::S3::Resource.new(region: ENV.fetch("AWS_REGION", "us-east-1"))
                                      .bucket(ENV.fetch("AWS_S3_BUCKET"))
    end

    def download_filename(export)
      "export_#{export.resource}_#{export.id}.#{export.format}"
    end

    def mime_for(format)
      case format
      when "xlsx" then "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      else             "text/csv; charset=utf-8"
      end
    end
  end
end
