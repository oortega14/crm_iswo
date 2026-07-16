# frozen_string_literal: true

# Assets mínimos para Mission Control Jobs (/jobs) en app API-only.
Rails.application.config.assets.paths << Rails.root.join("app/assets/stylesheets")

if defined?(MissionControl::Jobs::Engine)
  engine_root = MissionControl::Jobs::Engine.root
  Rails.application.config.assets.paths << engine_root.join("app/assets/stylesheets")
  Rails.application.config.assets.paths << engine_root.join("app/javascript")
  Rails.application.config.assets.precompile += %w[
    mission_control/application.css
    mission_control/application.js
  ]
end
