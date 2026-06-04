ENV["BUNDLE_GEMFILE"] ||= File.expand_path("../Gemfile", __dir__)

require "bundler/setup" # Set up gems listed in the Gemfile.

# Carga api/.env antes de Rails — necesario para ANTHROPIC_API_KEY, DB_*, etc.
# DATABASE_URL nunca debe estar en .env: Rails lo tomaría sobre database.yml
# y RSpec borraría la BD de desarrollo. Las credenciales van en DB_HOST/DB_USERNAME/etc.
rails_env = ENV["RAILS_ENV"] || ENV["RACK_ENV"] || "development"
if %w[development test].include?(rails_env)
  begin
    require "dotenv"
    Dotenv.load(File.expand_path("../.env", __dir__))
  rescue LoadError
    # dotenv-rails también carga en application.rb
  end
end

require "bootsnap/setup" # Speed up boot time by caching expensive operations.
