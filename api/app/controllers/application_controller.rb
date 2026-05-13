class ApplicationController < ActionController::API
  include ActionController::Cookies

  # Fallback para cualquier ruta no mapeada en routes.rb
  def route_not_found
    render json: {
      error: "not_found",
      message: "Ruta no encontrada"
    }, status: :not_found
  end
end
