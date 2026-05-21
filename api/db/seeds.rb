# frozen_string_literal: true

# ============================================================================
# Seeds — F5 Verticales
# ----------------------------------------------------------------------------
# Crea los 3 tenants del RFC con configuración real por vertical:
#   - ISWO       → consultoría / servicios ISO
#   - Mi Casita  → crédito de vivienda e inmobiliaria
#   - Libranzas  → crédito por descuento de nómina
#
# Idempotente: usa find_or_create_by! en todo, seguro correrlo varias veces.
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
        "modules"   => %w[opportunities contacts pipeline reminders network exports landings],
        "industry"  => "consulting_iso",
        "show_bant" => true
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
      { name: "Propuesta Enviada",  position: 2, probability: 45,  color: "#818CF8" },
      { name: "Negociación",        position: 3, probability: 70,  color: "#F59E0B" },
      { name: "Contrato Firmado",   position: 4, probability: 100, color: "#16A34A", closed_won:  true },
      { name: "Perdida",            position: 5, probability: 0,   color: "#DC2626", closed_lost: true }
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
      { name: "Carlos Mejía",      email: "carlos@iswo.local",    role: "consultant", password: "Password123!" }
    ],
    demo_contacts: [
      { first_name: "Marcela",  last_name: "Torres",   email: "marcela@ejemplo.co",  phone_e164: "+573001234001", company_name: "Constructora Omega" },
      { first_name: "Ricardo",  last_name: "Patiño",   email: "ricardo@ejemplo.co",  phone_e164: "+573001234002", company_name: "Clínica San Rafael" },
      { first_name: "Valentina",last_name: "Herrera",  email: "valentina@ejemplo.co",phone_e164: "+573001234003", company_name: "Alimentos del Valle" }
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
      { name: "Visita Realizada",      position: 2, probability: 40,  color: "#818CF8" },
      { name: "Oferta Presentada",     position: 3, probability: 60,  color: "#F59E0B" },
      { name: "En Proceso Escritura",  position: 4, probability: 85,  color: "#F97316" },
      { name: "Escriturado",           position: 5, probability: 100, color: "#16A34A", closed_won:  true },
      { name: "Perdida",               position: 6, probability: 0,   color: "#DC2626", closed_lost: true }
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
    ],
    demo_contacts: [
      { first_name: "Jorge",    last_name: "Salcedo",   email: "jorge@ejemplo.co",   phone_e164: "+573101234001", company_name: nil, document_id: "12345678" },
      { first_name: "Patricia", last_name: "Villamizar",email: "patricia@ejemplo.co",phone_e164: "+573101234002", company_name: nil, document_id: "87654321" },
      { first_name: "Sergio",   last_name: "Córdoba",   email: "sergio@ejemplo.co",  phone_e164: "+573101234003", company_name: nil, document_id: "11223344" }
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
      { name: "Estudio de Crédito",     position: 2, probability: 50,  color: "#818CF8" },
      { name: "Aprobado",               position: 3, probability: 80,  color: "#F59E0B" },
      { name: "Desembolsado",           position: 4, probability: 100, color: "#16A34A", closed_won:  true },
      { name: "Rechazado / Perdido",    position: 5, probability: 0,   color: "#DC2626", closed_lost: true }
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
    ],
    demo_contacts: [
      { first_name: "Hernando", last_name: "Roa",      email: "hernando@ejemplo.co", phone_e164: "+573201234001", company_name: "Empresa Pública Departamental", document_id: "55667788" },
      { first_name: "Carmen",   last_name: "Duarte",   email: "carmen@ejemplo.co",   phone_e164: "+573201234002", company_name: "Hospital Universitario",         document_id: "99887766" },
      { first_name: "Nelson",   last_name: "Jiménez",  email: "nelson@ejemplo.co",   phone_e164: "+573201234003", company_name: "Ministerio de Educación",        document_id: "44332211" }
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

def seed_demo_contacts(tenant, contacts_config, owner_user)
  contacts_config.map do |c|
    contact = Contact.find_or_initialize_by(tenant: tenant, email: c[:email])
    contact.assign_attributes(
      first_name:   c[:first_name],
      last_name:    c[:last_name],
      phone_e164:   c[:phone_e164],
      company_name: c[:company_name],
      document_id:  c[:document_id],
      kind:         "person",
      owner_user:   owner_user
    )
    contact.save!
    contact
  end
end

def seed_demo_opportunities(tenant, contacts, pipeline, owner_user)
  stage_list = pipeline.pipeline_stages.order(:position).to_a
  won_stage  = stage_list.find(&:closed_won)
  open_stage = stage_list.reject { |s| s.closed_won || s.closed_lost }

  configs = [
    { status: "won",      stage: won_stage  || stage_list.last, value: 8_000_000,  bant: 82, closed: true,  days_ago: 5  },
    { status: "proposal", stage: open_stage[2] || stage_list[2], value: 3_500_000, bant: 65, closed: false, days_ago: 2  },
    { status: "new_lead", stage: open_stage[0] || stage_list[0], value: 1_200_000, bant: 40, closed: false, days_ago: 0  },
  ]

  contacts.each_with_index do |contact, i|
    cfg   = configs[i] || configs.last
    stage = cfg[:stage] || stage_list.first
    opp   = Opportunity.find_or_initialize_by(tenant: tenant, contact: contact, title: "Oportunidad #{contact.first_name}")
    opp.assign_attributes(
      pipeline:          pipeline,
      pipeline_stage:    stage,
      owner_user:        owner_user,
      status:            cfg[:status],
      estimated_value:   cfg[:value],
      bant_score:        cfg[:bant],
      last_activity_at:  cfg[:days_ago].days.ago,
      closed_at:         cfg[:closed] ? cfg[:days_ago].days.ago : nil
    )
    opp.save!

    # Log de creación para que aparezca en el activity feed de hoy
    if cfg[:days_ago] == 0
      OpportunityLog.find_or_create_by(
        tenant:      tenant,
        opportunity: opp,
        action:      "create",
        user:        owner_user
      ) do |log|
        log.changes_data = { title: opp.title, pipeline_stage_id: stage.id }
        log.ip_address   = "127.0.0.1"
      end
    end
  end
end

# ---------------------------------------------------------------------------
# Ejecución
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

    # Usar el primer consultant como propietario del demo; si no hay, usar el admin
    demo_owner = users.find { |u| u.role == "consultant" } || users.first

    contacts = seed_demo_contacts(tenant, config[:demo_contacts], demo_owner)
    puts "     #{contacts.size} contactos de demo"

    seed_demo_opportunities(tenant, contacts, pipeline, demo_owner)
    puts "     #{contacts.size} oportunidades de demo"
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
end
puts "\nCredenciales de prueba (password: Password123!):"
puts "  admin@iswo.local       → ISWO"
puts "  admin@micasita.local   → Mi Casita"
puts "  admin@libranzas.local  → Libranzas"
puts "Listo.\n"
