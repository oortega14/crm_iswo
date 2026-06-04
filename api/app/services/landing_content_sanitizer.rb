# frozen_string_literal: true

# ============================================================================
# LandingContentSanitizer — limpia HTML/CSS de GrapeJS antes de persistir.
# ============================================================================
# Defensa en profundidad: el SPA también sanitiza al renderizar (DOMPurify).
# ============================================================================
class LandingContentSanitizer
  ALLOWED_TAGS = %w[
    a abbr address article aside audio b blockquote br button caption cite code col colgroup
    div dl dt dd em fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hr i iframe img
    input label legend li main mark nav ol optgroup option p picture pre section select small span
    strong sub sup table tbody td textarea tfoot th thead tr u ul video source
  ].freeze

  ALLOWED_ATTRIBUTES = %w[
    class id style href src alt title width height target rel type placeholder value
    allow allowfullscreen frameborder scrolling colspan rowspan disabled checked readonly
    name for action method enctype autocomplete rows cols maxlength min max step
    data-gjs-type data-highlightable
  ].freeze

  class << self
    def sanitize_content!(content)
      return content unless content.is_a?(Hash)

      copy = content.deep_dup
      if copy["gjs_html"].present?
        copy["gjs_html"] = strip_forms(sanitize_html(copy["gjs_html"]))
      end
      copy["gjs_css"]  = sanitize_css(copy["gjs_css"]) if copy["gjs_css"].present?
      copy
    end

    def sanitize_html(html)
      ActionController::Base.helpers.sanitize(
        html.to_s,
        tags: ALLOWED_TAGS,
        attributes: ALLOWED_ATTRIBUTES
      )
    end

    def strip_forms(html)
      fragment = Nokogiri::HTML.fragment(html.to_s)
      fragment.css("form").remove
      fragment.to_html
    end

    def sanitize_css(css)
      css.to_s
          .gsub(%r{</style}i, "")
          .gsub(%r{<script\b[^>]*>.*?</script>}im, "")
          .gsub(/<[^>]+>/, "")
          .gsub(/javascript:/i, "")
          .gsub(/expression\s*\(/i, "")
          .gsub(/behavior\s*:/i, "")
    end
  end
end
