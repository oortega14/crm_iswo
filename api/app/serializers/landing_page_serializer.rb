# frozen_string_literal: true

# ============================================================================
# LandingPageSerializer
# ============================================================================
# Para listas de admin (panel) no se incluye `content`/`styles` (pueden pesar
# MB por landing). Solo se devuelven con el flag `include_content: true`,
# que se pasa vía `params` en el controller (show).
# ============================================================================
class LandingPageSerializer < ApplicationSerializer
  set_type :landing_page

  attributes :title, :slug, :seo_title, :seo_description, :og_image_url,
             :thumbnail_url, :published, :published_at, :view_count, :lead_count

  attribute :public_url do |l|
    l.public_url
  end

  attribute :content, if: ->(_r, params) { params && params[:include_content] }
  attribute :styles,  if: ->(_r, params) { params && params[:include_content] }

  belongs_to :default_owner, serializer: :user, record_type: :user, if: Proc.new { |l| l.respond_to?(:default_owner_id) }
end
