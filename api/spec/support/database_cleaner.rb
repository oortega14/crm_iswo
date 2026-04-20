# frozen_string_literal: true

# ============================================================================
# DatabaseCleaner — transacciones por defecto, truncate cuando se usa JS.
# ============================================================================
RSpec.configure do |config|
  config.before(:suite) do
    DatabaseCleaner.clean_with(:truncation)
  end

  config.before(:each) do |example|
    DatabaseCleaner.strategy =
      if example.metadata[:js] || example.metadata[:truncation]
        :truncation
      else
        :transaction
      end
    DatabaseCleaner.start
  end

  config.append_after(:each) do
    DatabaseCleaner.clean
  end
end
