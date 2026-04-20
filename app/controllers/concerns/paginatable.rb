# frozen_string_literal: true

# ============================================================================
# Paginatable — paginación con pagy y headers estándar.
# ============================================================================
# Expone `pagy_headers(pagy)` que setea:
#   - Current-Page
#   - Page-Items
#   - Total-Pages
#   - Total-Count
# El SPA React lee estos headers para el componente TanStack Table.
# ============================================================================
module Paginatable
  extend ActiveSupport::Concern

  included do
    include Pagy::Backend
  end

  DEFAULT_PER_PAGE = 25
  MAX_PER_PAGE     = 200

  private

  def paginate(scope, items: nil)
    items ||= params[:per_page].presence&.to_i || DEFAULT_PER_PAGE
    items = [items, MAX_PER_PAGE].min
    pagy(scope, items: items)
  end

  def pagy_headers(pagy)
    response.set_header("Current-Page", pagy.page.to_s)
    response.set_header("Page-Items",   pagy.items.to_s)
    response.set_header("Total-Pages",  pagy.pages.to_s)
    response.set_header("Total-Count",  pagy.count.to_s)
  end
end
