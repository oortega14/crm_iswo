source "https://rubygems.org"

ruby "4.0.0"

# ============================================================================
# Core
# ============================================================================
gem "rails", "~> 8.1.3"
gem "pg", "~> 1.5"
gem "puma", ">= 6"
gem "bootsnap", require: false
gem "tzinfo-data", platforms: %i[windows jruby]

# ============================================================================
# API / JSON
# ============================================================================
gem "jsonapi-serializer", "~> 2.2"  # Serialización JSON:API para el SPA
gem "oj", "~> 3.16"                 # Fast JSON

# ============================================================================
# Multi-tenancy
# ============================================================================
gem "acts_as_tenant", "~> 1.0"

# ============================================================================
# Autenticación y autorización
# ============================================================================
gem "devise", "~> 4.9"
gem "devise-jwt", "~> 0.12"
gem "pundit", "~> 2.4"

# ============================================================================
# Background jobs (Sidekiq, NO SolidQueue)
# ============================================================================
gem "sidekiq", "~> 7.3"
gem "sidekiq-scheduler", "~> 5.0"   # Cron-like scheduling
gem "sidekiq-unique-jobs", "~> 8.0" # Deduplicación de jobs
gem "redis", "~> 5.3"

# ============================================================================
# CORS (SPA React en otro origen)
# ============================================================================
gem "rack-cors", "~> 2.0"
gem "rack-attack", "~> 6.7"         # Rate limiting (A.6.8)

# ============================================================================
# Audit / soft-delete
# ============================================================================
gem "audited", "~> 5.7"             # PaperTrail alternative
gem "discard", "~> 1.3"             # Soft-delete

# ============================================================================
# Cifrado de datos sensibles (credenciales de integraciones)
# ============================================================================
gem "lockbox", "~> 2.0"
gem "blind_index", "~> 2.5"

# ============================================================================
# Dominio
# ============================================================================
gem "phonelib", "~> 0.8"            # Normalización E.164 para duplicados
gem "pagy", "~> 9.0"                # Paginación ligera
gem "ransack", "~> 4.2"             # Filtros seguros

# ============================================================================
# Exportaciones (CSV + XLSX)
# ============================================================================
gem "caxlsx_rails", "~> 0.6"
gem "csv"

# ============================================================================
# HTTP client para integraciones (Meta, Google, Twilio)
# ============================================================================
gem "faraday", "~> 2.10"
gem "faraday-retry", "~> 2.2"

# ============================================================================
# Email
# ============================================================================
gem "postmark-rails", "~> 0.22"

# ============================================================================
# Utilidades
# ============================================================================
gem "dotenv-rails", "~> 3.1", groups: %i[development test]
gem "kaminari", require: false      # compat

group :development, :test do
  gem "rspec-rails", "~> 7.0"
  gem "factory_bot_rails", "~> 6.4"
  gem "faker", "~> 3.4"
  gem "pry-rails"
  gem "debug", platforms: %i[mri windows]
end

group :development do
  gem "rubocop-rails-omakase", require: false
  gem "annotaterb", "~> 4.13"
  gem "bullet", "~> 7.2"
  gem "brakeman", require: false
  gem "letter_opener"
end

group :test do
  gem "shoulda-matchers", "~> 6.4"
  gem "database_cleaner-active_record", "~> 2.2"
  gem "webmock", "~> 3.23"
  gem "vcr", "~> 6.3"
  gem "simplecov", require: false
end
