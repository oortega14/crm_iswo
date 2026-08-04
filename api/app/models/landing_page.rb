# frozen_string_literal: true

# ============================================================================
# LandingPage — página editable por tenant con captura de leads
# ============================================================================
class LandingPage < ApplicationRecord
  include TenantScoped

  APPROVAL_STATUSES = %w[pending approved rejected].freeze

  belongs_to :tenant
  belongs_to :requested_by, class_name: "User", foreign_key: :requested_by_user_id, optional: true
  belongs_to :reviewed_by,  class_name: "User", foreign_key: :reviewed_by_user_id,  optional: true
  has_many :landing_form_submissions, dependent: :destroy

  enum :approval_status, APPROVAL_STATUSES.index_with(&:itself), prefix: true, default: "pending"

  validates :title, presence: true
  validates :slug,
            presence: true,
            uniqueness: { scope: :tenant_id, case_sensitive: false },
            format: { with: /\A[a-z0-9](?:[a-z0-9\-]{0,80}[a-z0-9])?\z/,
                      message: "solo minúsculas, números y guiones" }
  validate :cannot_publish_without_approval

  before_validation :normalize_slug
  before_save :set_published_at
  before_save :sanitize_grapejs_content

  scope :published, -> { where(published: true) }

  def conversion_rate
    return 0.0 if view_count.zero?

    (lead_count.to_f / view_count * 100).round(2)
  end

  def public_url
    "#{public_base_url}/#{slug}"
  end

  def public_base_url
    if ENV["LANDING_PUBLIC_HOST"].present?
      ENV["LANDING_PUBLIC_HOST"].strip.chomp("/")
    elsif Rails.env.production?
      "https://#{tenant.slug}.iswocrm.com"
    else
      port = ENV.fetch("VITE_FRONTEND_PORT", "3001")
      "http://#{tenant.slug}.localhost:#{port}"
    end
  end

  private

  def cannot_publish_without_approval
    return unless published && !approval_status_approved?

    errors.add(:published, "requiere aprobación del administrador de la plataforma")
  end

  def normalize_slug
    self.slug = slug&.downcase&.strip
  end

  def set_published_at
    self.published_at ||= Time.current if published && published_at.blank?
    self.published_at = nil unless published
  end

  def sanitize_grapejs_content
    return unless content.is_a?(Hash)

    self.content = LandingContentSanitizer.sanitize_content!(content)
  end
end
