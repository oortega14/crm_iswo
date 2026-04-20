# frozen_string_literal: true

# ============================================================================
# LandingPage — página editable por tenant con captura de leads
# ============================================================================
class LandingPage < ApplicationRecord
  include TenantScoped

  belongs_to :tenant
  has_many :landing_form_submissions, dependent: :destroy

  validates :title, presence: true
  validates :slug,
            presence: true,
            uniqueness: { scope: :tenant_id, case_sensitive: false },
            format: { with: /\A[a-z0-9](?:[a-z0-9\-]{0,80}[a-z0-9])?\z/,
                      message: "solo minúsculas, números y guiones" }

  before_validation :normalize_slug
  before_save :set_published_at

  scope :published, -> { where(published: true) }

  def public_url
    "https://#{tenant.slug}.crm.iswo.com.co/#{slug}"
  end

  private

  def normalize_slug
    self.slug = slug&.downcase&.strip
  end

  def set_published_at
    self.published_at ||= Time.current if published && published_at.blank?
    self.published_at = nil unless published
  end
end
