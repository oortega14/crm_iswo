# frozen_string_literal: true

require "sidekiq/web"
require "sidekiq-scheduler/web"

Rails.application.routes.draw do
  # ==========================================================================
  # Sidekiq Web UI
  # --------------------------------------------------------------------------
  # En producción se protege con HTTP Basic (ver ApplicationController de
  # Sidekiq Web) o detrás de VPN. En desarrollo queda abierto.
  # ==========================================================================
  if Rails.env.production?
    Sidekiq::Web.use Rack::Auth::Basic do |user, pass|
      ActiveSupport::SecurityUtils.secure_compare(user, ENV.fetch("SIDEKIQ_WEB_USERNAME", "")) &
        ActiveSupport::SecurityUtils.secure_compare(pass, ENV.fetch("SIDEKIQ_WEB_PASSWORD", ""))
    end
  end
  mount Sidekiq::Web => "/sidekiq"

  # ==========================================================================
  # Health check
  # ==========================================================================
  get "/up", to: "rails/health#show", as: :rails_health_check

  # ==========================================================================
  # Devise (solo rutas de session para integrarse con devise-jwt)
  # --------------------------------------------------------------------------
  # Todo lo demás (registrations, passwords, confirmations) lo manejamos en
  # controladores custom dentro de Api::V1 para output JSON consistente.
  # ==========================================================================
  devise_for :users,
             skip: %i[registrations passwords confirmations unlocks],
             path: "api/v1",
             path_names: { sign_in: "sessions", sign_out: "sessions" },
             controllers: { sessions: "api/v1/sessions" },
             defaults: { format: :json }

  # ==========================================================================
  # API v1
  # ==========================================================================
  namespace :api, defaults: { format: :json } do
    namespace :v1 do
      # ---- Autenticación auxiliar --------------------------------------------
      post "/sessions/refresh", to: "sessions#refresh"
      post "/password/forgot",  to: "passwords#forgot"
      post "/password/reset",   to: "passwords#reset"
      post "/password/change",  to: "passwords#change"

      # ---- Usuario actual ----------------------------------------------------
      get   "/me", to: "me#show"
      patch "/me", to: "me#update"

      # ---- Configuración del tenant ------------------------------------------
      resource :tenant,          only: %i[show update], controller: "tenants"
      resource :bant_criterion,  only: %i[show update], controller: "bant_criteria"

      # ---- Usuarios del tenant -----------------------------------------------
      resources :users do
        member do
          post :activate
          post :deactivate
          post :reset_password
        end
      end

      # ---- Pipelines y etapas ------------------------------------------------
      resources :pipelines do
        resources :stages,
                  controller: :pipeline_stages,
                  only: %i[index create update destroy] do
          collection { patch :reorder }
        end
      end

      resources :lead_sources

      # ---- Contactos ---------------------------------------------------------
      resources :contacts do
        collection do
          get  :check_duplicates      # ?phone=...&email=...
          post :export                # encola ExportGenerationJob
        end
      end

      # ---- Oportunidades -----------------------------------------------------
      resources :opportunities do
        member do
          post :move_stage           # { pipeline_stage_id }
          post :assign               # { owner_user_id }
          post :merge                # { target_id }
          post :recalculate_bant
        end
        collection do
          get  :kanban               # vista agrupada por etapa
          post :export
        end

        resources :logs,
                  controller: :opportunity_logs,
                  only: %i[index create]
        resources :reminders,
                  only: %i[index create],
                  controller: :reminders,
                  as: :opportunity_reminders
        resources :whatsapp_messages,
                  only: %i[index create],
                  controller: :whatsapp_messages,
                  as: :opportunity_whatsapp_messages
      end

      # ---- Recordatorios standalone ------------------------------------------
      resources :reminders, only: %i[index show update destroy] do
        member { post :complete; post :snooze }
      end

      # ---- Duplicados --------------------------------------------------------
      resources :duplicate_flags, only: %i[index show] do
        member do
          post :reassign
          post :merge
          post :ignore
        end
      end

      # ---- Red de consultores ------------------------------------------------
      resources :referral_networks, only: %i[index create destroy] do
        collection do
          get :tree                 # ?root_user_id=…&depth=…
          get :my_network
        end
      end

      # ---- Landing pages -----------------------------------------------------
      resources :landing_pages do
        member do
          post :publish
          post :unpublish
          post :duplicate
        end
        resources :submissions,
                  controller: :landing_form_submissions,
                  only: :index
      end

      # ---- Integraciones de ads ---------------------------------------------
      resources :ad_integrations do
        member { post :test_connection; post :disable }
      end

      # ---- WhatsApp standalone ----------------------------------------------
      resources :whatsapp_messages, only: %i[index show]

      # ---- Exports ----------------------------------------------------------
      resources :exports, only: %i[index show create]

      # ========================================================================
      # Webhooks (autenticación por firma, no JWT)
      # ========================================================================
      namespace :webhooks do
        # Meta Ads Lead Webhook: GET verify, POST payload
        get  "/meta",            to: "meta_ads#verify"
        post "/meta",            to: "meta_ads#create"

        # Google Ads Lead Form Extensions (Conversion API)
        post "/google",          to: "google_ads#create"

        # WhatsApp — Twilio y Cloud API
        post "/whatsapp/twilio", to: "whatsapp#twilio"
        post "/whatsapp/cloud",  to: "whatsapp#cloud"
        get  "/whatsapp/cloud",  to: "whatsapp#verify_cloud"
      end

      # ========================================================================
      # Endpoints públicos (sin autenticación)
      # ========================================================================
      namespace :public, path: "public" do
        get  "/landings/:slug",        to: "landing_pages#show", as: :landing_page
        post "/landings/:slug/submit", to: "landing_form_submissions#create", as: :landing_submit
      end
    end
  end

  # Fallback 404 JSON para rutas fuera del API
  match "*unmatched", to: "application#route_not_found", via: :all
end
