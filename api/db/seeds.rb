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
    ],
    demo_contacts: [
      { first_name: "Marcela",   last_name: "Torres",    email: "marcela@ejemplo.co",   phone_e164: "+573001234001", company_name: "Constructora Omega" },
      { first_name: "Ricardo",   last_name: "Patiño",    email: "ricardo@ejemplo.co",   phone_e164: "+573001234002", company_name: "Clínica San Rafael" },
      { first_name: "Valentina", last_name: "Herrera",   email: "valentina@ejemplo.co", phone_e164: "+573001234003", company_name: "Alimentos del Valle" }
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
    ],
    demo_contacts: [
      { first_name: "Jorge",    last_name: "Salcedo",    email: "jorge@ejemplo.co",    phone_e164: "+573101234001", document_id: "12345678" },
      { first_name: "Patricia", last_name: "Villamizar", email: "patricia@ejemplo.co", phone_e164: "+573101234002", document_id: "87654321" },
      { first_name: "Sergio",   last_name: "Córdoba",    email: "sergio@ejemplo.co",   phone_e164: "+573101234003", document_id: "11223344" }
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
    ],
    demo_contacts: [
      { first_name: "Hernando", last_name: "Roa",    email: "hernando@ejemplo.co", phone_e164: "+573201234001", company_name: "Gobernación del Valle",  document_id: "55667788" },
      { first_name: "Carmen",   last_name: "Duarte", email: "carmen@ejemplo.co",   phone_e164: "+573201234002", company_name: "Hospital Universitario", document_id: "99887766" },
      { first_name: "Nelson",   last_name: "Jiménez",email: "nelson@ejemplo.co",   phone_e164: "+573201234003", company_name: "Ministerio de Educación",document_id: "44332211" }
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

def seed_duplicate_flags(tenant, contacts, pipeline, admin_user)
  # Ya existe al menos un flag pendiente → idempotente, nada que hacer
  return if DuplicateFlag.where(tenant: tenant, resolution: "pending").exists?

  stage = pipeline.pipeline_stages.order(:position).first
  return unless stage

  # Encuentra el contacto con exactamente 1 opp abierta para crear la segunda
  contact = contacts.find do |c|
    Opportunity.where(tenant: tenant, contact: c)
               .where.not(status: %w[won lost merged])
               .count == 1
  end
  return unless contact

  existing_opp = Opportunity.where(tenant: tenant, contact: contact)
                             .where.not(status: %w[won lost merged])
                             .first
  return unless existing_opp

  title = "Duplicado de #{contact.first_name} (demo)"
  duplicate_opp = Opportunity.find_or_initialize_by(tenant: tenant, contact: contact, title: title)
  unless duplicate_opp.persisted?
    duplicate_opp.assign_attributes(
      pipeline:        pipeline,
      pipeline_stage:  stage,
      owner_user:      admin_user,
      status:          "new_lead",
      estimated_value: existing_opp.estimated_value,
      currency:        tenant.currency
    )
    duplicate_opp.save!
  end

  return if duplicate_opp.id == existing_opp.id

  DuplicateFlag.find_or_create_by!(
    tenant:                   tenant,
    opportunity:              duplicate_opp,
    duplicate_of_opportunity: existing_opp
  ) do |f|
    f.detected_by_user = admin_user
    f.matched_on       = contact.phone_e164.present? ? "phone" : "email"
    f.match_score      = 1.0
  end
rescue ActiveRecord::RecordInvalid => e
  puts "     [duplicados] skip: #{e.message}"
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

  # Demo F2: cadena consultor→consultor para probar visibilidad de opps en red
  if consultants.size >= 2
    ReferralNetwork.find_or_create_by!(tenant: tenant, referrer_user: consultants[0], referred_user: consultants[1]) do |rn|
      rn.depth = 1
      rn.active = true
    end
  end
  if consultants.size >= 3
    ReferralNetwork.find_or_create_by!(tenant: tenant, referrer_user: consultants[1], referred_user: consultants[2]) do |rn|
      rn.depth = 1
      rn.active = true
    end
  end
rescue ActiveRecord::RecordInvalid => e
  puts "     [referral] skip: #{e.message}"
end

OPPORTUNITY_TEMPLATES = {
  "iswo" => [
    { value: 22_000_000, bant: 88, temp: "hot", status: "won", days_ago: 0, stage_pos: :won, note: "Contrato firmado. Implementación ISO 9001 para 3 sedes." },
    { value: 25_000_000, bant: 92, temp: "hot", status: "won", days_ago: 0, stage_pos: :won, note: "Proyecto corporativo multisite. Mejor cierre del mes." },
    { value: 14_000_000, bant: 82, temp: "hot", status: "won", days_ago: 0, stage_pos: :won, note: "Recertificación ISO 45001. Cliente de larga data." }
  ],
  "micasita" => [
    { value: 380_000_000, bant: 85, temp: "hot", status: "won", days_ago: 0, stage_pos: :won, note: "Escritura firmada. Apartamento en El Poblado." },
    { value: 310_000_000, bant: 83, temp: "hot", status: "won", days_ago: 0, stage_pos: :won, note: "Casa en Laureles. Cierre exitoso." },
    { value: 450_000_000, bant: 91, temp: "hot", status: "won", days_ago: 0, stage_pos: :won, note: "Penthouse Envigado. Financiación aprobada." }
  ],
  "libranzas" => [
    { value: 18_000_000, bant: 84, temp: "hot", status: "won", days_ago: 0, stage_pos: :won, note: "Desembolsado. Descuento nómina activo." },
    { value: 28_000_000, bant: 91, temp: "hot", status: "won", days_ago: 0, stage_pos: :won, note: "Funcionario público. Mejor libranza del mes." },
    { value: 22_000_000, bant: 88, temp: "hot", status: "won", days_ago: 0, stage_pos: :won, note: "Monto alto. Empleada Gobernación. Cierre rápido." }
  ]
}.freeze

LANDING_TEMPLATES = {
  "iswo" => [
    {
      title:           "Diagnóstico ISO Gratuito",
      slug:            "diagnostico-iso-gratuito",
      seo_title:       "Diagnóstico ISO Gratuito — ISWO",
      seo_description: "Agenda tu diagnóstico ISO sin costo. Evaluamos el estado de tu sistema de gestión.",
      published:       true,
      view_count:      142,
      lead_count:      18,
      gjs_html: <<~HTML.strip
        <section style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;text-align:center">
          <h1 style="color:#0F172A;font-size:2rem;margin-bottom:16px">Diagnóstico ISO <span style="color:#2563EB">Gratuito</span></h1>
          <p style="color:#64748B;font-size:1.1rem;margin-bottom:32px">Evaluamos el estado de tu sistema de gestión sin costo. Cupos limitados.</p>
          <form data-gjs-type="form" method="post">
            <input type="text" name="name" placeholder="Tu nombre completo" style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #CBD5E1;border-radius:8px;font-size:1rem" required/>
            <input type="email" name="email" placeholder="Correo empresarial" style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #CBD5E1;border-radius:8px;font-size:1rem" required/>
            <input type="tel" name="phone" placeholder="WhatsApp de contacto" style="width:100%;padding:12px;margin-bottom:20px;border:1px solid #CBD5E1;border-radius:8px;font-size:1rem"/>
            <button type="submit" style="background:#2563EB;color:white;padding:14px 32px;border:none;border-radius:8px;font-size:1rem;cursor:pointer;width:100%">Quiero mi diagnóstico gratis</button>
          </form>
        </section>
      HTML
    },
    {
      title:           "Certificación ISO 9001 — 2026",
      slug:            "iso-9001-2026",
      seo_title:       "Certifícate en ISO 9001 con ISWO",
      seo_description: "Acompaña tu proceso de certificación ISO 9001:2015 con expertos ISWO.",
      published:       true,
      view_count:      89,
      lead_count:      11,
      gjs_html: <<~HTML.strip
        <section style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;text-align:center">
          <h1 style="color:#0F172A;font-size:2rem;margin-bottom:16px">Certifícate en <span style="color:#2563EB">ISO 9001</span></h1>
          <p style="color:#64748B;font-size:1.1rem;margin-bottom:32px">Proceso guiado de 4 meses. Más de 200 empresas certificadas con ISWO.</p>
          <form data-gjs-type="form" method="post">
            <input type="text" name="name" placeholder="Nombre y empresa" style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #CBD5E1;border-radius:8px;font-size:1rem" required/>
            <input type="email" name="email" placeholder="Email corporativo" style="width:100%;padding:12px;margin-bottom:20px;border:1px solid #CBD5E1;border-radius:8px;font-size:1rem" required/>
            <button type="submit" style="background:#2563EB;color:white;padding:14px 32px;border:none;border-radius:8px;font-size:1rem;cursor:pointer;width:100%">Solicitar información</button>
          </form>
        </section>
      HTML
    },
    {
      title:           "Webinar: ISO para PYMEs",
      slug:            "webinar-iso-pymes",
      seo_title:       "Webinar Gratuito ISO para PYMEs — ISWO",
      seo_description: "Aprende cómo implementar ISO en tu PYME sin grandes inversiones.",
      published:       false,
      view_count:      0,
      lead_count:      0,
      gjs_html: <<~HTML.strip
        <section style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;text-align:center">
          <h1 style="color:#0F172A;font-size:2rem;margin-bottom:16px">Webinar Gratuito<br/><span style="color:#2563EB">ISO para PYMEs</span></h1>
          <p style="color:#64748B;font-size:1.1rem;margin-bottom:32px">Jueves 12 de junio · 6:00 pm Colombia. Cupos limitados.</p>
          <form data-gjs-type="form" method="post">
            <input type="text" name="name" placeholder="Tu nombre" style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #CBD5E1;border-radius:8px;font-size:1rem" required/>
            <input type="email" name="email" placeholder="Email de registro" style="width:100%;padding:12px;margin-bottom:20px;border:1px solid #CBD5E1;border-radius:8px;font-size:1rem" required/>
            <button type="submit" style="background:#2563EB;color:white;padding:14px 32px;border:none;border-radius:8px;font-size:1rem;cursor:pointer;width:100%">Reservar mi cupo</button>
          </form>
        </section>
      HTML
    }
  ],
  "micasita" => [
    {
      title:           "Tu Casa en Medellín",
      slug:            "tu-casa-medellin",
      seo_title:       "Encuentra tu hogar en Medellín — Mi Casita",
      seo_description: "Casas y apartamentos nuevos en Medellín con la asesoría de Mi Casita.",
      published:       true,
      view_count:      310,
      lead_count:      42,
      gjs_html: <<~HTML.strip
        <section style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;text-align:center">
          <h1 style="color:#1e293b;font-size:2rem;margin-bottom:16px">Encuentra tu <span style="color:#1D4ED8">hogar ideal</span><br/>en Medellín</h1>
          <p style="color:#64748B;font-size:1.1rem;margin-bottom:32px">Más de 500 inmuebles disponibles. Asesoría personalizada sin costo.</p>
          <form data-gjs-type="form" method="post">
            <input type="text" name="name" placeholder="Tu nombre completo" style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #CBD5E1;border-radius:8px;font-size:1rem" required/>
            <input type="tel" name="phone" placeholder="Celular / WhatsApp" style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #CBD5E1;border-radius:8px;font-size:1rem" required/>
            <select name="budget" style="width:100%;padding:12px;margin-bottom:20px;border:1px solid #CBD5E1;border-radius:8px;font-size:1rem">
              <option value="">¿Cuánto puedes invertir?</option>
              <option>Menos de $200M</option>
              <option>$200M – $350M</option>
              <option>$350M – $500M</option>
              <option>Más de $500M</option>
            </select>
            <button type="submit" style="background:#1D4ED8;color:white;padding:14px 32px;border:none;border-radius:8px;font-size:1rem;cursor:pointer;width:100%">Quiero ver opciones</button>
          </form>
        </section>
      HTML
    },
    {
      title:           "Simulador de Crédito Hipotecario",
      slug:            "simulador-credito",
      seo_title:       "Simula tu crédito hipotecario — Mi Casita",
      seo_description: "Calcula tu cuota mensual y conoce cuánto puedes pedir para comprar vivienda.",
      published:       true,
      view_count:      215,
      lead_count:      29,
      gjs_html: <<~HTML.strip
        <section style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;text-align:center">
          <h1 style="color:#1e293b;font-size:2rem;margin-bottom:16px">Simula tu <span style="color:#1D4ED8">crédito hipotecario</span></h1>
          <p style="color:#64748B;font-size:1.1rem;margin-bottom:32px">Sin compromiso. Te llamamos con las mejores opciones del mercado.</p>
          <form data-gjs-type="form" method="post">
            <input type="text" name="name" placeholder="Nombre completo" style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #CBD5E1;border-radius:8px;font-size:1rem" required/>
            <input type="email" name="email" placeholder="Tu correo" style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #CBD5E1;border-radius:8px;font-size:1rem" required/>
            <input type="tel" name="phone" placeholder="WhatsApp" style="width:100%;padding:12px;margin-bottom:20px;border:1px solid #CBD5E1;border-radius:8px;font-size:1rem"/>
            <button type="submit" style="background:#1D4ED8;color:white;padding:14px 32px;border:none;border-radius:8px;font-size:1rem;cursor:pointer;width:100%">Ver mi simulación</button>
          </form>
        </section>
      HTML
    },
    {
      title:           "Feria Inmobiliaria Junio 2026",
      slug:            "feria-inmobiliaria-junio",
      seo_title:       "Feria Inmobiliaria Junio 2026 — Mi Casita",
      seo_description: "Regístrate y accede a descuentos exclusivos en la Feria Inmobiliaria de Mi Casita.",
      published:       false,
      view_count:      0,
      lead_count:      0,
      gjs_html: <<~HTML.strip
        <section style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;text-align:center">
          <h1 style="color:#1e293b;font-size:2rem;margin-bottom:16px">Feria Inmobiliaria<br/><span style="color:#1D4ED8">Junio 2026</span></h1>
          <p style="color:#64748B;font-size:1.1rem;margin-bottom:32px">21 y 22 de junio · Centro de Convenciones. Entrada gratis pre-registrando.</p>
          <form data-gjs-type="form" method="post">
            <input type="text" name="name" placeholder="Nombre completo" style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #CBD5E1;border-radius:8px;font-size:1rem" required/>
            <input type="tel" name="phone" placeholder="Celular" style="width:100%;padding:12px;margin-bottom:20px;border:1px solid #CBD5E1;border-radius:8px;font-size:1rem" required/>
            <button type="submit" style="background:#1D4ED8;color:white;padding:14px 32px;border:none;border-radius:8px;font-size:1rem;cursor:pointer;width:100%">Pre-registrarme</button>
          </form>
        </section>
      HTML
    }
  ],
  "libranzas" => [
    {
      title:           "Crédito por Libranza — Rápido y Fácil",
      slug:            "credito-libranza",
      seo_title:       "Crédito por Libranza sin trámites — Libranzas ISWO",
      seo_description: "Solicita tu crédito por libranza. Aprobación en 24 horas para empleados públicos.",
      published:       true,
      view_count:      487,
      lead_count:      63,
      gjs_html: <<~HTML.strip
        <section style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;text-align:center">
          <h1 style="color:#14532d;font-size:2rem;margin-bottom:16px">Crédito por Libranza<br/><span style="color:#166534">rápido y seguro</span></h1>
          <p style="color:#64748B;font-size:1.1rem;margin-bottom:32px">Aprobación en 24 horas. Para empleados públicos y privados. Sin codeudor.</p>
          <form data-gjs-type="form" method="post">
            <input type="text" name="name" placeholder="Nombre completo" style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #CBD5E1;border-radius:8px;font-size:1rem" required/>
            <input type="tel" name="phone" placeholder="WhatsApp" style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #CBD5E1;border-radius:8px;font-size:1rem" required/>
            <input type="text" name="employer" placeholder="Empresa donde trabajas" style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #CBD5E1;border-radius:8px;font-size:1rem" required/>
            <select name="amount" style="width:100%;padding:12px;margin-bottom:20px;border:1px solid #CBD5E1;border-radius:8px;font-size:1rem">
              <option value="">¿Cuánto necesitas?</option>
              <option>$2M – $5M</option>
              <option>$5M – $10M</option>
              <option>$10M – $20M</option>
              <option>Más de $20M</option>
            </select>
            <button type="submit" style="background:#166534;color:white;padding:14px 32px;border:none;border-radius:8px;font-size:1rem;cursor:pointer;width:100%">Solicitar ahora</button>
          </form>
        </section>
      HTML
    },
    {
      title:           "Consolida tus Deudas con Libranza",
      slug:            "consolidacion-deudas",
      seo_title:       "Consolida deudas con libranza — Libranzas ISWO",
      seo_description: "Unifica todas tus deudas en una sola cuota mensual descontada de nómina.",
      published:       true,
      view_count:      198,
      lead_count:      27,
      gjs_html: <<~HTML.strip
        <section style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;text-align:center">
          <h1 style="color:#14532d;font-size:2rem;margin-bottom:16px">Consolida tus deudas<br/><span style="color:#166534">una sola cuota</span></h1>
          <p style="color:#64748B;font-size:1.1rem;margin-bottom:32px">Reduce tu carga financiera. Descuento directo de nómina. Tasa preferencial.</p>
          <form data-gjs-type="form" method="post">
            <input type="text" name="name" placeholder="Nombre completo" style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #CBD5E1;border-radius:8px;font-size:1rem" required/>
            <input type="email" name="email" placeholder="Correo electrónico" style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #CBD5E1;border-radius:8px;font-size:1rem" required/>
            <input type="tel" name="phone" placeholder="Celular / WhatsApp" style="width:100%;padding:12px;margin-bottom:20px;border:1px solid #CBD5E1;border-radius:8px;font-size:1rem" required/>
            <button type="submit" style="background:#166534;color:white;padding:14px 32px;border:none;border-radius:8px;font-size:1rem;cursor:pointer;width:100%">Quiero consolidar</button>
          </form>
        </section>
      HTML
    },
    {
      title:           "Libranza para Pensionados",
      slug:            "libranza-pensionados",
      seo_title:       "Crédito por libranza para pensionados — Libranzas ISWO",
      seo_description: "Accede a crédito con descuento directo de tu mesada pensional.",
      published:       false,
      view_count:      0,
      lead_count:      0,
      gjs_html: <<~HTML.strip
        <section style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;text-align:center">
          <h1 style="color:#14532d;font-size:2rem;margin-bottom:16px">Libranza<br/><span style="color:#166534">para Pensionados</span></h1>
          <p style="color:#64748B;font-size:1.1rem;margin-bottom:32px">Descuento de tu mesada pensional. Sin fiadores. Proceso 100% digital.</p>
          <form data-gjs-type="form" method="post">
            <input type="text" name="name" placeholder="Tu nombre completo" style="width:100%;padding:12px;margin-bottom:12px;border:1px solid #CBD5E1;border-radius:8px;font-size:1rem" required/>
            <input type="tel" name="phone" placeholder="WhatsApp" style="width:100%;padding:12px;margin-bottom:20px;border:1px solid #CBD5E1;border-radius:8px;font-size:1rem" required/>
            <button type="submit" style="background:#166534;color:white;padding:14px 32px;border:none;border-radius:8px;font-size:1rem;cursor:pointer;width:100%">Solicitar crédito</button>
          </form>
        </section>
      HTML
    }
  ]
}.freeze

def seed_landing_form_submissions(tenant, pipeline)
  return unless defined?(LandingFormSubmission) && defined?(LandingSubmissionProcessor)

  form_leads = {
    "iswo"      => [
      { full_name: "Camilo Arango",    email: "camilo.a@ejemplo.co",   phone: "3006001001", company: "Ferretería Nacional" },
      { full_name: "Lucía Montoya",    email: "lucia.m@ejemplo.co",    phone: "3006001002", company: "Hospital del Norte"  },
      { full_name: "Sebastián Vargas", email: "sebas.v@ejemplo.co",    phone: "3006001003", company: "Minería Sur"         }
    ],
    "micasita"  => [
      { full_name: "Carolina Méndez",  email: "caro.m@ejemplo.co",     phone: "3106001001", company: nil },
      { full_name: "Tatiana Guerrero", email: "tatiana.g@ejemplo.co",  phone: "3106001002", company: nil },
      { full_name: "Gustavo Pineda",   email: "gus.p@ejemplo.co",      phone: "3106001003", company: nil }
    ],
    "libranzas" => [
      { full_name: "Gloria Peñaloza",  email: "gloria.p@ejemplo.co",   phone: "3206001001", company: "Alcaldía de Medellín"  },
      { full_name: "Oswaldo Muñoz",    email: "oswal.m@ejemplo.co",    phone: "3206001002", company: "Banco Popular"         },
      { full_name: "Beatriz Lozano",   email: "bea.l@ejemplo.co",      phone: "3206001003", company: "SENA Regional"         }
    ]
  }

  leads      = form_leads[tenant.slug] || form_leads["iswo"]
  landings   = LandingPage.where(tenant: tenant, published: true).to_a
  return if landings.empty?

  leads.each_with_index do |lead, i|
    landing = landings[i % landings.size]
    payload = { "full_name" => lead[:full_name], "email" => lead[:email],
                "phone" => lead[:phone], "company" => lead[:company] }.compact

    submission = LandingFormSubmission.find_or_initialize_by(
      tenant:      tenant,
      landing_page: landing,
      payload:     payload
    )
    if submission.new_record?
      submission.assign_attributes(
        utm_source:   %w[google facebook whatsapp directo][i % 4],
        utm_medium:   %w[cpc social organic][i % 3],
        utm_campaign: "demo_seed_#{tenant.slug}"
      )
      submission.save!
      LandingSubmissionProcessor.new(submission).call
    end
  end
rescue => e
  puts "     [form_submissions] #{e.message}"
end

def seed_landing_pages(tenant)
  templates = LANDING_TEMPLATES[tenant.slug] || []
  templates.each do |t|
    lp = LandingPage.find_or_initialize_by(tenant: tenant, slug: t[:slug])
    lp.assign_attributes(
      title:           t[:title],
      seo_title:       t[:seo_title],
      seo_description: t[:seo_description],
      published:       t[:published],
      view_count:      t[:view_count],
      lead_count:      t[:lead_count],
      content:         { "gjs_html" => t[:gjs_html], "gjs_css" => "" }
    )
    lp.save!
  end
end

def seed_demo_opportunities(tenant, contacts, pipeline, users)
  stage_list  = pipeline.pipeline_stages.order(:position).to_a
  won_stage   = stage_list.find(&:closed_won)
  lost_stage  = stage_list.find(&:closed_lost)
  open_stages = stage_list.reject { |s| s.closed_won || s.closed_lost }

  templates = OPPORTUNITY_TEMPLATES[tenant.slug] || OPPORTUNITY_TEMPLATES["iswo"]
  consultants = users.select { |u| u.role == "consultant" }
  default_owner = consultants.first || users.find { |u| u.role == "admin" } || users.first

  contacts.first(templates.size).each_with_index do |contact, i|
    tmpl  = templates[i]
    stage = case tmpl[:stage_pos]
            when :won  then won_stage  || stage_list.last
            when :lost then lost_stage || stage_list.last
            when Integer then open_stages[tmpl[:stage_pos]] || open_stages.last || stage_list.first
            else open_stages.first || stage_list.first
            end

    owner = consultants[i % [consultants.size, 1].max] || default_owner

    opp = Opportunity.find_or_initialize_by(
      tenant:  tenant,
      contact: contact,
      title:   "#{contact.first_name} #{contact.last_name} — #{pipeline.name}"
    )
    opp.assign_attributes(
      pipeline:         pipeline,
      pipeline_stage:   stage,
      owner_user:       owner,
      status:           tmpl[:status],
      temperature:      tmpl[:temp],
      estimated_value:  tmpl[:value],
      bant_score:       tmpl[:bant],
      notes:            tmpl[:note],
      last_activity_at: tmpl[:days_ago].days.ago,
      closed_at:        (tmpl[:status] == "won" || tmpl[:status] == "lost") ? tmpl[:days_ago].days.ago : nil,
      currency:         tenant.currency
    )
    opp.save!

    # Logs de actividad
    OpportunityLog.find_or_create_by(tenant: tenant, opportunity: opp, action: "create", user: owner) do |log|
      log.changes_data = { stage: stage.name }
      log.ip_address   = "127.0.0.1"
    end

    if tmpl[:days_ago] <= 2 && %w[won proposal].include?(tmpl[:status])
      OpportunityLog.find_or_create_by(tenant: tenant, opportunity: opp, action: "stage_change", user: owner) do |log|
        log.note         = "Avance a #{stage.name}"
        log.ip_address   = "127.0.0.1"
        log.changes_data = { stage: stage.name }
      end
    end

    # Recordatorio en oportunidades activas
    if %w[new_lead contacted qualified proposal].include?(tmpl[:status]) && i.even?
      due = tmpl[:days_ago] == 0 ? 2.days.from_now : 1.day.from_now
      Reminder.find_or_create_by(tenant: tenant, opportunity: opp, user: owner) do |r|
        r.remind_at = due
        r.channel   = %w[email whatsapp in_app][i % 3]
        r.message   = "Seguimiento con #{contact.first_name}"
        r.status    = "pending"
      end
    end

    # Campos custom para verticales
    if tenant.slug == "micasita" && opp.custom_fields.blank?
      opp.update_column(:custom_fields, {
        "tipo_inmueble"     => %w[Apartamento Casa Lote Oficina][i % 4],
        "ciudad"            => %w[Medellín Bogotá Cali Barranquilla][i % 4],
        "estrato"           => (3 + (i % 3)).to_s,
        "credito_hipotecario" => [true, false][i % 2]
      })
    end

    if tenant.slug == "libranzas" && opp.custom_fields.blank?
      opp.update_column(:custom_fields, {
        "tipo_libranza" => %w[Libre\ inversión Consolidación Educación Vivienda][i % 4],
        "plazo_meses"   => [24, 36, 48, 60][i % 4].to_s,
        "empleador"     => contact.company_name
      })
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

    demo_owner = users.find { |u| u.role == "consultant" } || users.first

    contacts = seed_demo_contacts(tenant, config[:demo_contacts], demo_owner)
    puts "     #{contacts.size} contactos de demo"

    seed_demo_opportunities(tenant, contacts, pipeline, users)
    opp_count = Opportunity.where(tenant: tenant).count
    puts "     #{opp_count} oportunidades de demo"

    seed_duplicate_flags(tenant, contacts, pipeline, users.find { |u| u.role == 'admin' } || users.first)
    puts "     #{DuplicateFlag.where(tenant: tenant).count} flag(s) de duplicados de demo"

    seed_field_definitions(tenant)
    puts "     #{TenantFieldDefinition.where(tenant: tenant).count} campos personalizados (vertical)"

    seed_referral_networks(tenant, users)
    puts "     Red de referidos sembrada (#{ReferralNetwork.where(tenant: tenant).count} relaciones)"

    seed_landing_pages(tenant)
    puts "     #{LandingPage.where(tenant: tenant).count} landing pages (#{LandingPage.where(tenant: tenant, published: true).count} publicadas)"

    seed_landing_form_submissions(tenant, pipeline)
    puts "     #{LandingFormSubmission.where(tenant: tenant).count} envío(s) de formulario simulado(s)"
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
end
puts "\nCredenciales de prueba (password: Password123!):"
puts "  admin@iswo.local       → ISWO"
puts "  admin@micasita.local   → Mi Casita"
puts "  admin@libranzas.local  → Libranzas"
puts "Listo.\n"
