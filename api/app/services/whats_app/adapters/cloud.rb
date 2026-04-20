# frozen_string_literal: true

module WhatsApp
  module Adapters
    # ==========================================================================
    # WhatsApp::Adapters::Cloud — envío vía WhatsApp Cloud API (Meta).
    # ==========================================================================
    # Endpoint:  https://graph.facebook.com/{version}/{phone_number_id}/messages
    # Auth:      Bearer token (System User access token)
    # Body:      JSON
    #
    # Credenciales (ordenadas por prioridad):
    #   1. tenant.settings["whatsapp"]["cloud_access_token"] / ..._phone_number_id /
    #      ..._api_version
    #   2. ENV: WHATSAPP_CLOUD_ACCESS_TOKEN, WHATSAPP_CLOUD_PHONE_NUMBER_ID,
    #           WHATSAPP_CLOUD_API_VERSION (default v18.0)
    #
    # Para mensajes con media: Meta requiere subir el media primero (/media)
    # o pasar un link público vía `image.link`. Aquí usamos `link` cuando hay
    # `media_url`; subir media binaria queda fuera de este MVP.
    #
    # Respuesta exitosa (200):
    #   {
    #     "messaging_product": "whatsapp",
    #     "messages": [{ "id": "wamid.HBgM..." }]
    #   }
    # ==========================================================================
    class Cloud < Base
      DEFAULT_API_VERSION = "v18.0"
      BASE_URL            = "https://graph.facebook.com"

      def deliver(message)
        token           = tenant_setting(:cloud_access_token,    "WHATSAPP_CLOUD_ACCESS_TOKEN")
        phone_number_id = tenant_setting(:cloud_phone_number_id, "WHATSAPP_CLOUD_PHONE_NUMBER_ID")
        api_version     = tenant_setting(:cloud_api_version,     "WHATSAPP_CLOUD_API_VERSION") || DEFAULT_API_VERSION

        raise_delivery!("Credenciales WhatsApp Cloud incompletas para tenant #{@tenant.id}") if
          token.blank? || phone_number_id.blank?

        body = build_payload(message)

        conn = Faraday.new(url: BASE_URL) do |f|
          f.request  :json
          f.response :json, content_type: /\bjson$/
          f.options.timeout      = DEFAULT_TIMEOUT
          f.options.open_timeout = DEFAULT_TIMEOUT
        end

        path = "/#{api_version}/#{phone_number_id}/messages"
        res  = conn.post(path) do |req|
          req.headers["Authorization"] = "Bearer #{token}"
          req.headers["Content-Type"]  = "application/json"
          req.body = body
        end

        unless res.success?
          err = extract_error(res.body)
          raise_delivery!("Cloud API: #{err}")
        end

        msg = (res.body["messages"] || []).first || {}
        {
          provider_message_id: msg["id"],
          # Cloud API responde "accepted" en sincrónico; el estado real
          # llega por webhook. Reportamos "sent" para reflejar que el envío
          # fue aceptado por Meta.
          status:              "sent"
        }
      end

      private

      def build_payload(message)
        to = normalize_e164(message.to_number).sub(/\A\+/, "")

        if message.media_url.present?
          {
            messaging_product: "whatsapp",
            recipient_type:    "individual",
            to:                to,
            type:              media_type_for(message.media_url),
            media_type_for(message.media_url) => {
              link:    message.media_url,
              caption: message.body.presence
            }.compact
          }
        else
          {
            messaging_product: "whatsapp",
            recipient_type:    "individual",
            to:                to,
            type:              "text",
            text:              { body: message.body.to_s, preview_url: false }
          }
        end
      end

      # Heurística mínima por extensión. Para producción conviene apoyarse
      # en el Content-Type real del media.
      def media_type_for(url)
        ext = File.extname(URI(url).path.to_s).downcase.delete(".")
        case ext
        when "jpg", "jpeg", "png", "webp"        then "image"
        when "mp4", "3gp"                        then "video"
        when "mp3", "ogg", "amr", "aac"          then "audio"
        when "pdf", "doc", "docx", "xls", "xlsx" then "document"
        else "document"
        end
      rescue URI::InvalidURIError
        "document"
      end

      def extract_error(body)
        return "HTTP error" unless body.is_a?(Hash)

        err = body["error"] || {}
        msg = err["message"] || err["error_user_msg"] || body["message"]
        code = err["code"] || err["error_subcode"]
        [msg, ("(code #{code})" if code)].compact.join(" ").presence || "respuesta inválida"
      end
    end
  end
end
