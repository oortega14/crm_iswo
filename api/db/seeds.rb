# frozen_string_literal: true

# ============================================================================
# Seeds — F5 Verticales
# ----------------------------------------------------------------------------
# Crea los 3 tenants del RFC con configuración real por vertical:
#   - ISWO       → consultoría / servicios ISO
#   - Mi Casita  → crédito de vivienda e inmobiliaria
#   - Libranzas  → crédito por descuento de nómina
#
# Idempotente: tenants, usuarios, pipelines (sin landings de plantilla en F5 ni contactos/opps demo).
# Leads demo (5 por tenant): bundle exec rails leads:demo_pack  — o SEED_DEMO_LEADS=1 db:seed
# ============================================================================

puts "\n=== Seeds F5 — CRM ISWO ===\n\n"

# ---------------------------------------------------------------------------
# Definición de verticales
# ---------------------------------------------------------------------------

VERTICALS = [
  # -------------------------------------------------------------------------
  # ISWO — Plataforma de Sistemas de Gestión ISO
  # -------------------------------------------------------------------------
  {
    tenant: {
      name:          "ISWO",
      slug:          "iswo",
      legal_name:    "ISWO SAS",
      primary_color: "#0F172A",
      currency:      "COP",
      locale:        "es-CO",
      timezone:      "America/Bogota",
      settings: {
        "modules"       => %w[opportunities contacts pipeline reminders network exports landings],
        "industry"      => "consulting_iso",
        "show_bant"     => true,
        "network_depth" => 3
      }
    },
    bant: {
      budget_weight:    25,
      authority_weight: 35,   # firma de contratos ISO requiere decisor clave
      need_weight:      25,
      timeline_weight:  15,
      threshold_qualified: 65
    },
    pipeline: {
      name:        "Ciclo de Consultoría ISO",
      description: "Pipeline principal para venta de servicios ISO"
    },
    stages: [
      { name: "Prospecto",          position: 0, probability: 10,  color: "#94A3B8" },
      { name: "Diagnóstico",        position: 1, probability: 25,  color: "#60A5FA" },
      { name: "Calificada",         position: 2, probability: 40,  color: "#22C55E" },
      { name: "Propuesta Enviada",  position: 3, probability: 55,  color: "#818CF8" },
      { name: "Negociación",        position: 4, probability: 70,  color: "#F59E0B" },
      { name: "Contrato Firmado",   position: 5, probability: 100, color: "#16A34A", closed_won:  true },
      { name: "Perdida",            position: 6, probability: 0,   color: "#DC2626", closed_lost: true }
    ],
    lead_sources: [
      { kind: "web",      name: "Sitio Web ISWO" },
      { kind: "referral", name: "Referido Consultor" },
      { kind: "manual",   name: "Evento / Feria ISO" },
      { kind: "manual",   name: "LinkedIn" },
      { kind: "whatsapp", name: "WhatsApp Comercial" },
      { kind: "google",   name: "Google Ads" }
    ],
    users: [
      { name: "Admin ISWO",       email: "admin@iswo.local",      role: "admin",      password: "Password123!" },
      { name: "Gerente Comercial", email: "gerente@iswo.local",   role: "manager",    password: "Password123!" },
      { name: "Laura Ríos",        email: "laura@iswo.local",     role: "consultant", password: "Password123!" },
      { name: "Carlos Mejía",      email: "carlos@iswo.local",    role: "consultant", password: "Password123!" },
      { name: "Observador ISWO",   email: "viewer@iswo.local",    role: "viewer",     password: "Password123!" }
    ]
  },

  # -------------------------------------------------------------------------
  # Mi Casita — Crédito de Vivienda e Inmobiliaria
  # -------------------------------------------------------------------------
  {
    tenant: {
      name:          "Mi Casita",
      slug:          "micasita",
      legal_name:    "Mi Casita Inmobiliaria SAS",
      primary_color: "#1D4ED8",
      currency:      "COP",
      locale:        "es-CO",
      timezone:      "America/Bogota",
      settings: {
        "modules"         => %w[opportunities contacts pipeline reminders network exports landings],
        "industry"        => "real_estate",
        "show_bant"       => true,
        "network_depth"   => 3,
        "opportunity_fields" => {
          "estimated_value_label" => "Valor del inmueble",
          "show_document_id"      => true
        }
      }
    },
    bant: {
      budget_weight:    40,   # el presupuesto define qué inmueble puede comprar
      authority_weight: 25,
      need_weight:      20,
      timeline_weight:  15,
      threshold_qualified: 60
    },
    pipeline: {
      name:        "Ciclo de Venta Inmobiliaria",
      description: "Desde el primer contacto hasta la escritura"
    },
    stages: [
      { name: "Interesado",            position: 0, probability: 10,  color: "#94A3B8" },
      { name: "Visita Agendada",       position: 1, probability: 25,  color: "#60A5FA" },
      { name: "Calificada",            position: 2, probability: 40,  color: "#22C55E" },
      { name: "Visita Realizada",      position: 3, probability: 55,  color: "#818CF8" },
      { name: "Oferta Presentada",     position: 4, probability: 70,  color: "#F59E0B" },
      { name: "En Proceso Escritura",  position: 5, probability: 85,  color: "#F97316" },
      { name: "Escriturado",           position: 6, probability: 100, color: "#16A34A", closed_won:  true },
      { name: "Perdida",               position: 7, probability: 0,   color: "#DC2626", closed_lost: true }
    ],
    lead_sources: [
      { kind: "web",      name: "Sitio Web Mi Casita" },
      { kind: "meta",     name: "Meta Ads — Facebook/Instagram" },
      { kind: "google",   name: "Google Ads" },
      { kind: "whatsapp", name: "WhatsApp" },
      { kind: "referral", name: "Referido Cliente" },
      { kind: "manual",   name: "Finca Raíz / Portales" },
      { kind: "manual",   name: "Feria Inmobiliaria" }
    ],
    users: [
      { name: "Admin Mi Casita",    email: "admin@micasita.local",    role: "admin",      password: "Password123!" },
      { name: "Directora Comercial",email: "directora@micasita.local",role: "manager",    password: "Password123!" },
      { name: "Andrés Morales",     email: "andres@micasita.local",   role: "consultant", password: "Password123!" },
      { name: "Diana Castillo",     email: "diana@micasita.local",    role: "consultant", password: "Password123!" },
      { name: "Felipe Guzmán",      email: "felipe@micasita.local",   role: "consultant", password: "Password123!" }
    ]
  },

  # -------------------------------------------------------------------------
  # Libranzas — Crédito por Descuento de Nómina
  # -------------------------------------------------------------------------
  {
    tenant: {
      name:          "Libranzas ISWO",
      slug:          "libranzas",
      legal_name:    "Libranzas ISWO SAS",
      primary_color: "#166534",
      currency:      "COP",
      locale:        "es-CO",
      timezone:      "America/Bogota",
      settings: {
        "modules"         => %w[opportunities contacts pipeline reminders network exports landings],
        "industry"        => "payroll_credit",
        "show_bant"       => true,
        "network_depth"   => 3,
        "opportunity_fields" => {
          "estimated_value_label" => "Monto del crédito",
          "show_document_id"      => true
        }
      }
    },
    bant: {
      budget_weight:    25,
      authority_weight: 30,   # autorización del empleador es clave en libranza
      need_weight:      25,
      timeline_weight:  20,
      threshold_qualified: 55  # umbral más bajo — mayor volumen, menor ticket
    },
    pipeline: {
      name:        "Proceso de Libranza",
      description: "Desde la solicitud hasta el desembolso"
    },
    stages: [
      { name: "Solicitud Recibida",     position: 0, probability: 15,  color: "#94A3B8" },
      { name: "Documentación",          position: 1, probability: 30,  color: "#60A5FA" },
      { name: "Calificada",             position: 2, probability: 45,  color: "#22C55E" },
      { name: "Estudio de Crédito",     position: 3, probability: 60,  color: "#818CF8" },
      { name: "Aprobado",               position: 4, probability: 80,  color: "#F59E0B" },
      { name: "Desembolsado",           position: 5, probability: 100, color: "#16A34A", closed_won:  true },
      { name: "Rechazado / Perdido",    position: 6, probability: 0,   color: "#DC2626", closed_lost: true }
    ],
    lead_sources: [
      { kind: "whatsapp", name: "WhatsApp" },
      { kind: "web",      name: "Sitio Web" },
      { kind: "manual",   name: "Call Center" },
      { kind: "manual",   name: "Empresa Convenio" },
      { kind: "referral", name: "Referido" },
      { kind: "meta",     name: "Meta Ads" }
    ],
    users: [
      { name: "Admin Libranzas",     email: "admin@libranzas.local",    role: "admin",      password: "Password123!" },
      { name: "Coordinador Crédito", email: "coordinador@libranzas.local",role: "manager",  password: "Password123!" },
      { name: "María Forero",        email: "maria@libranzas.local",    role: "consultant", password: "Password123!" },
      { name: "Luis Pedraza",        email: "luis@libranzas.local",     role: "consultant", password: "Password123!" },
      { name: "Sandra Ospina",       email: "sandra@libranzas.local",   role: "consultant", password: "Password123!" }
    ]
  }
].freeze

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def seed_tenant(config)
  t_attrs = config[:tenant]
  puts "  → Tenant: #{t_attrs[:name]} (#{t_attrs[:slug]})"

  tenant = Tenant.find_or_initialize_by(slug: t_attrs[:slug])
  tenant.assign_attributes(
    name:          t_attrs[:name],
    legal_name:    t_attrs[:legal_name],
    primary_color: t_attrs[:primary_color],
    currency:      t_attrs[:currency],
    locale:        t_attrs[:locale],
    timezone:      t_attrs[:timezone],
    settings:      t_attrs[:settings],
    active:        true
  )
  tenant.save!
  tenant
end

def seed_bant(tenant, bant_config)
  criterion = BantCriterion.find_or_initialize_by(tenant: tenant)
  criterion.assign_attributes(bant_config)
  criterion.save!
end

def seed_pipeline(tenant, pipeline_config, stages_config)
  pipeline = Pipeline.find_or_initialize_by(tenant: tenant, name: pipeline_config[:name])
  pipeline.assign_attributes(
    description: pipeline_config[:description],
    is_default:  true,
    active:      true
  )
  pipeline.save!

  stages_config.each do |s|
    stage = pipeline.pipeline_stages.find_or_initialize_by(name: s[:name])
    stage.assign_attributes(
      tenant:      tenant,
      position:    s[:position],
      probability: s[:probability],
      color:       s[:color],
      closed_won:  s[:closed_won]  || false,
      closed_lost: s[:closed_lost] || false
    )
    stage.save!
  end

  pipeline
end

def seed_lead_sources(tenant, sources_config)
  sources_config.each do |src|
    LeadSource.find_or_initialize_by(tenant: tenant, name: src[:name]).tap do |ls|
      ls.kind   = src[:kind]
      ls.active = true
      ls.save!
    end
  end
end

def seed_users(tenant, users_config)
  users_config.map do |u|
    user = User.find_or_initialize_by(tenant: tenant, email: u[:email])
    user.assign_attributes(
      name:         u[:name],
      role:         u[:role],
      confirmed_at: Time.current,
      active:       true
    )
    user.password = u[:password] if user.new_record?
    user.save!
    user
  end
end

def seed_field_definitions(tenant)
  fields = Tenants::Onboarder::VERTICAL_FIELDS[tenant.slug] || []
  return if fields.empty?

  fields.each do |attrs|
    TenantFieldDefinition.find_or_initialize_by(tenant: tenant, key: attrs[:key]).tap do |d|
      d.assign_attributes(attrs.except(:key))
      d.save!
    end
  end
end

def seed_referral_networks(tenant, users)
  admin      = users.find { |u| u.role == "admin" }
  manager    = users.find { |u| u.role == "manager" }
  consultants = users.select { |u| u.role == "consultant" }

  # Raíz del árbol: admin, o manager si no hay admin
  root = admin || manager || users.first
  return unless root

  # Conectar manager debajo del admin (si existen ambos)
  if admin && manager
    ReferralNetwork.find_or_create_by!(tenant: tenant, referrer_user: admin, referred_user: manager) do |rn|
      rn.depth = 1; rn.active = true
    end
  end

  # RFC §6.3: cada consultor cuelga del manager/admin (no en cadena entre pares).
  # Así un consultor solo ve sus opps + las de referidos directos/indirectos que él refirió.
  parent = manager || admin
  consultant_ids = consultants.map(&:id)
  consultants.each do |c|
    ReferralNetwork.where(tenant: tenant, referred_user: c, referrer_user_id: consultant_ids - [c.id]).delete_all
    ReferralNetwork.find_or_create_by!(tenant: tenant, referrer_user: parent, referred_user: c) do |rn|
      rn.depth = 1
      rn.active = true
    end
  end

rescue ActiveRecord::RecordInvalid => e
  puts "     [referral] skip: #{e.message}"
end

def seed_landing_pages(tenant)
  Landings::TenantSetup.apply!(tenant)
end

# ---------------------------------------------------------------------------
# Tenant plataforma — super-admin (onboarding de otros tenants)
# ---------------------------------------------------------------------------

puts "\n[Super Admin — tenant plataforma]"
platform = Tenants::PlatformSeeder.call!
puts "  → #{platform.tenant.name} (#{platform.tenant.slug}) — #{platform.created ? 'creado' : 'ya existía'}"
puts "     admin: #{platform.admin_user.email}"

# ---------------------------------------------------------------------------
# Ejecución verticales F5
# ---------------------------------------------------------------------------

VERTICALS.each do |config|
  puts "\n[#{config[:tenant][:name]}]"

  tenant = seed_tenant(config)

  ActsAsTenant.with_tenant(tenant) do
    seed_bant(tenant, config[:bant])
    puts "     BANT configurado (budget:#{config[:bant][:budget_weight]} authority:#{config[:bant][:authority_weight]} need:#{config[:bant][:need_weight]} timeline:#{config[:bant][:timeline_weight]})"

    pipeline = seed_pipeline(tenant, config[:pipeline], config[:stages])
    puts "     Pipeline '#{pipeline.name}' con #{config[:stages].size} etapas"

    seed_lead_sources(tenant, config[:lead_sources])
    puts "     #{config[:lead_sources].size} fuentes de lead"

    users = seed_users(tenant, config[:users])
    puts "     #{users.size} usuarios (#{config[:users].map { |u| u[:role] }.join(', ')})"

    seed_field_definitions(tenant)
    puts "     #{TenantFieldDefinition.where(tenant: tenant).count} campos personalizados (vertical)"

    seed_referral_networks(tenant, users)
    puts "     Red de referidos sembrada (#{ReferralNetwork.where(tenant: tenant).count} relaciones)"

    seed_landing_pages(tenant)
    lp_count = LandingPage.where(tenant: tenant).count
    puts "     #{lp_count} landing pages (módulo activo; F5 sin plantillas precargadas)"

  end
end

# Quita plantillas de producto en verticales F5; no recrea landings en iswo/micasita/libranzas
puts "\n[Landings — verticales F5 sin plantillas]"
ActsAsTenant.without_tenant do
  Landings::TenantSetup::VERTICAL_SEED_SLUGS.each do |slug|
    tenant = Tenant.find_by(slug: slug)
    next unless tenant

    ActsAsTenant.with_tenant(tenant) do
      Landings::TenantSetup.apply!(tenant)
      n = LandingPage.where(tenant: tenant).count
      puts "  → #{slug}: #{n} landing(s)"
    end
  end
end

# ---------------------------------------------------------------------------
# Resumen final
# ---------------------------------------------------------------------------

ActsAsTenant.without_tenant do
  puts "\n=== Resumen ==="
  puts "Tenants:       #{Tenant.count}"
  puts "Usuarios:      #{User.count}"
  puts "Pipelines:     #{Pipeline.count}"
  puts "Etapas:        #{PipelineStage.count}"
  puts "Lead sources:  #{LeadSource.count}"
  puts "Contactos:     #{Contact.count}"
  puts "Oportunidades: #{Opportunity.count}"
  puts "Recordatorios: #{Reminder.count}"
  puts "Actividad:     #{OpportunityLog.count} logs"
  puts "Landings:      #{LandingPage.count} (#{LandingPage.where(published: true).count} publicadas)"

  demo_pattern = "%@leads.iswo.test"
  puts "\nPor tenant (F5):"
  %w[iswo micasita libranzas].each do |slug|
    tenant = Tenant.find_by(slug: slug)
    next unless tenant

    ActsAsTenant.with_tenant(tenant) do
      demo_n = Contact.kept.where("email LIKE ?", demo_pattern).count
      opp_n  = Opportunity.kept.count
      puts "  #{slug}: #{opp_n} oportunidades, #{demo_n} contactos demo"
    end
  end
end

if ENV["SEED_DEMO_LEADS"].to_s.match?(/\A(1|true|yes)\z/i)
  puts "\n[SEED_DEMO_LEADS] Cargando pack de 5 leads por tenant F5..."
  Leads::DemoPack.run!(tenant_slugs: %w[iswo micasita libranzas])
else
  demo_any = ActsAsTenant.without_tenant do
    Contact.kept.where("email LIKE ?", "%@leads.iswo.test").exists?
  end
  unless demo_any
    puts "\n--- Leads de demostración (no incluidos en db:seed) ---"
    puts "  cd api && TENANTS=iswo bundle exec rails leads:demo_pack"
    puts "  # o los 3 tenants: bundle exec rails leads:demo_full"
    puts "  # verificar:        bundle exec rails leads:status"
    puts "  # opcional en seed: SEED_DEMO_LEADS=1 bundle exec rails db:seed"
  end
end

puts "\nCredenciales de prueba (password: Password123!):"
puts "  admin@super-admin.local → Super Admin (onboarding de tenants)"
puts "  admin@iswo.local       → ISWO (vertical consultoría ISO)"
puts "  admin@micasita.local   → Mi Casita"
puts "  admin@libranzas.local  → Libranzas"
puts "  laura@iswo.local       → consultor ISWO (solo sus leads asignados)"
puts "Listo.\n"
