# frozen_string_literal: true

require "rails_helper"

RSpec.describe LandingContentSanitizer do
  describe ".sanitize_html" do
    it "elimina scripts y handlers inline" do
      dirty = '<div onclick="alert(1)">Hola<script>alert(1)</script></div>'
      clean = described_class.sanitize_html(dirty)
      expect(clean).to include("Hola")
      expect(clean).not_to include("script")
      expect(clean).not_to include("onclick")
    end

    it "conserva markup seguro de GrapeJS" do
      html = '<section class="hero"><h1>Título</h1><img src="/x.png" alt=""></section>'
      expect(described_class.sanitize_html(html)).to include("<h1>Título</h1>")
    end
  end

  describe ".sanitize_css" do
    it "elimina patrones peligrosos" do
      dirty = "body { color: red; } </style><script>alert(1)</script>"
      clean = described_class.sanitize_css(dirty)
      expect(clean).not_to include("</style")
      expect(clean).not_to include("script")
    end
  end

  describe ".sanitize_content!" do
    it "sanitiza gjs_html y gjs_css en el hash content" do
      content = {
        "gjs_html" => '<p>OK</p><script>x</script>',
        "gjs_css"  => "p { margin: 0; } javascript:alert(1)"
      }
      result = described_class.sanitize_content!(content)
      expect(result["gjs_html"]).not_to include("script")
      expect(result["gjs_css"]).not_to include("javascript:")
    end

    it "elimina formularios embebidos de gjs_html (el formulario vive al pie en el SPA)" do
      content = {
        "gjs_html" => '<section><h1>Hola</h1><form><input name="email"></form></section>',
        "gjs_css"  => ""
      }
      result = described_class.sanitize_content!(content)
      expect(result["gjs_html"]).to include("Hola")
      expect(result["gjs_html"]).not_to include("<form")
    end
  end
end
