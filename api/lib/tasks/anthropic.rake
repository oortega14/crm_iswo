# frozen_string_literal: true

namespace :anthropic do
  desc "Prueba conexión con Anthropic (clasificación de temperatura)"
  task test: :environment do
    key = Opportunities::AiClassifier.api_key
    unless key
      puts "❌ ANTHROPIC_API_KEY no está definida en el entorno."
      puts "   Crea api/.env con: ANTHROPIC_API_KEY=sk-ant-..."
      puts "   Reinicia bin/rails s después de guardar."
      exit 1
    end

    puts "✓ API key detectada (#{key[0, 8]}…#{key[-4, 4]})"
    puts "  Modelo: #{Opportunities::AiClassifier.model_name}"

    payload = {
      model:      Opportunities::AiClassifier.model_name,
      max_tokens: 80,
      messages:   [{ role: "user", content: 'Responde solo JSON: {"temperature":"warm","reasoning":"test","next_action":"ok"}' }]
    }

    response = Faraday.post(
      Opportunities::AiClassifier::ANTHROPIC_API_URL,
      payload.to_json,
      {
        "Content-Type"      => "application/json",
        "x-api-key"         => key,
        "anthropic-version" => "2023-06-01"
      }
    )

    puts "  HTTP #{response.status}"
    if response.success?
      puts "✓ Claude respondió correctamente"
      puts response.body.to_s.truncate(200)
    else
      puts "❌ Error de Anthropic:"
      puts response.body.to_s.truncate(500)
      exit 1
    end
  end
end
