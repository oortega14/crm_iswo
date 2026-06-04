# frozen_string_literal: true

# Sirve el favicon en peticiones al API (:3000), p. ej. letter_opener o pestañas en localhost:3000.
# La SPA en Vite (:3001) usa client/public/icon.svg.
class FaviconController < ActionController::API
  ICON = Rails.root.join("public/icon.svg").freeze

  def icon
    return head :not_found unless ICON.exist?

    send_data ICON.read, type: "image/svg+xml", disposition: "inline"
  end
end
