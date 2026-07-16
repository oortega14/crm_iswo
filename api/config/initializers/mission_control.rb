# frozen_string_literal: true

# Mission Control — UI /jobs para Solid Queue.

if Rails.env.production?
  Rails.application.configure do
    config.mission_control.jobs.http_basic_auth_enabled = true
    config.mission_control.jobs.http_basic_auth_user_name = ENV.fetch("JOBS_WEB_USERNAME", "admin")
    config.mission_control.jobs.http_basic_auth_password = ENV.fetch("JOBS_WEB_PASSWORD", "")
  end
end
