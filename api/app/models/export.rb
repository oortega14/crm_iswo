# frozen_string_literal: true

# ============================================================================
# Export — registro auditado de exportaciones CSV/XLSX
# ============================================================================
# El job ExportGenerationJob hace el heavy lifting, sube a storage con URL
# firmada y actualiza `file_url` + `expires_at`. CleanupExportsJob purga
# diariamente los expirados (A.7.10).
# ============================================================================
class Export < ApplicationRecord
  include TenantScoped

  RESOURCES = %w[contacts opportunities].freeze
  FORMATS   = %w[csv xlsx].freeze
  STATUSES  = %w[queued running succeeded failed expired].freeze

  enum :resource, RESOURCES.zip(RESOURCES).to_h, prefix: :resource
  enum :format,   FORMATS.zip(FORMATS).to_h,     prefix: :format
  enum :status,   STATUSES.zip(STATUSES).to_h,   prefix: :status, default: "queued"

  belongs_to :tenant
  belongs_to :user

  validates :resource, inclusion: { in: RESOURCES }
  validates :format,   inclusion: { in: FORMATS }
  validates :status,   inclusion: { in: STATUSES }

  scope :active,  -> { where.not(status: %w[expired failed]) }
  scope :expired, -> { where("expires_at < ?", Time.current) }

  def expired?
    expires_at.present? && expires_at < Time.current
  end
end
