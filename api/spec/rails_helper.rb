# frozen_string_literal: true

# ============================================================================
# rails_helper.rb — carga el entorno Rails + dependencias de test.
# ============================================================================
require "spec_helper"
ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
abort("Rails corriendo en modo producción!") if Rails.env.production?

require "rspec/rails"
require "factory_bot_rails"
require "shoulda/matchers"
require "webmock/rspec"
require "database_cleaner/active_record"
require "devise"

# Carga todos los support files
Dir[Rails.root.join("spec", "support", "**", "*.rb")].each { |f| require f }

# Run any available migration
begin
  ActiveRecord::Migration.maintain_test_schema!
rescue ActiveRecord::PendingMigrationError => e
  abort e.to_s.strip
end

RSpec.configure do |config|
  config.fixture_paths = [Rails.root.join("spec/fixtures").to_s]

  # Transactional fixtures: deshabilitamos porque usamos DatabaseCleaner.
  config.use_transactional_fixtures = false

  config.infer_spec_type_from_file_location!
  config.filter_rails_from_backtrace!

  # Helpers ----------------------------------------------------------------
  config.include FactoryBot::Syntax::Methods
  config.include ActiveSupport::Testing::TimeHelpers
  config.include ActiveJob::TestHelper, type: :job

  # Devise warden helpers para request specs
  config.include Devise::Test::IntegrationHelpers, type: :request
  config.include Devise::Test::ControllerHelpers, type: :controller

  # Limpia jobs encolados entre ejemplos
  config.before(:each) do
    ActiveJob::Base.queue_adapter = :test
    clear_enqueued_jobs if respond_to?(:clear_enqueued_jobs)
  end
end

Shoulda::Matchers.configure do |config|
  config.integrate do |with|
    with.test_framework :rspec
    with.library :rails
  end
end
