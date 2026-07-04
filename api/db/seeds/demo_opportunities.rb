# frozen_string_literal: true
# db/seeds/demo_opportunities.rb
# Crea 5 oportunidades por tenant (iswo, micasita, libranzas) para pruebas del CRM.
# Ejecutar: bundle exec rails runner db/seeds/demo_opportunities.rb

puts "Sembrando oportunidades de demo..."

# ─────────────────────────────────────────────────────────────────────────────
# Helper
# ─────────────────────────────────────────────────────────────────────────────
def create_opp_with_bant(contact_attrs:, opp_attrs:, bant_data:, custom_fields:, source:, owner:, reminder: nil)
  contact = Contact.find_or_initialize_by(email: contact_attrs[:email])
  contact.assign_attributes(contact_attrs.merge(owner_user_id: owner.id))
  contact.save!

  cf = custom_fields.merge("bant_data" => bant_data)
  attrs = opp_attrs.merge(contact: contact, owner_user_id: owner.id,
                          lead_source: source, custom_fields: cf, currency: "COP")
  opp = Opportunity.find_or_initialize_by(title: opp_attrs[:title])
  opp.assign_attributes(attrs)
  opp.save!

  # Calcular BANT score sin sincronizar temperatura (la seteamos manualmente)
  Opportunities::BantScorer.new(opp).call_and_persist!(sync_temperature: false)

  # Temperatura manual: más confiable en seed que llamar a IA
  opp.update_column(:temperature, opp_attrs[:temperature])

  if reminder
    Reminder.find_or_create_by!(opportunity: opp, subject: reminder[:subject]) do |r|
      r.user_id   = owner.id
      r.remind_at = reminder[:remind_at]
      r.channel   = "in_app"
      r.status    = "pending"
    end
  end

  opp.reload
  puts "  #{opp.title[0..55]} | #{opp.pipeline_stage.name} | #{opp.temperature} | BANT #{opp.bant_score}"
  opp
end

# ─────────────────────────────────────────────────────────────────────────────
# ISWO — Consultoría ISO
# ─────────────────────────────────────────────────────────────────────────────
puts "\n[iswo]"
ActsAsTenant.with_tenant(Tenant.find_by!(slug: "iswo")) do
  pl     = Pipeline.first!
  stages = PipelineStage.where(pipeline: pl).order(:position).to_a
  users  = User.where(role: %w[consultant manager]).to_a
  srcs   = LeadSource.all.index_by(&:name)
  u      = users.cycle

  # Oportunidad 1 — Hot, Negociación (BANT alto)
  create_opp_with_bant(
    contact_attrs: { first_name: "Industrias Metalúrgicas", last_name: "del Valle SAS",
                     company_name: "Metalúrgicas del Valle SAS",
                     email: "gerencia@metalurgicasvalle.co",
                     phone_normalized: "+573001234567", kind: "company", city: "Cali", country: "CO" },
    opp_attrs: { title: "Certificación ISO 9001 — Metalúrgicas del Valle",
                 pipeline: pl, pipeline_stage: stages[4],
                 temperature: "hot", estimated_value: 18_500_000,
                 expected_close_on: 45.days.from_now.to_date, last_activity_at: 2.days.ago,
                 description: "120 empleados, requiere ISO 9001 para licitaciones con el Estado. Decisor es el gerente general." },
    bant_data: { "budget" => { "amount" => 18_500_000 }, "authority" => { "role" => "gerente" },
                 "need" => { "intent" => "urgente" }, "timeline" => { "days" => 45 } },
    custom_fields: { "norma_iso" => "ISO 9001:2015", "sector_empresa" => "Manufactura",
                     "num_sedes" => "3", "estado_certificacion" => "Sin certificar",
                     "organismo_certificador" => "" },
    source: srcs["LinkedIn"], owner: u.next,
    reminder: { subject: "Enviar propuesta técnica definitiva", remind_at: 3.days.from_now }
  )

  # Oportunidad 2 — Hot, Propuesta Enviada
  create_opp_with_bant(
    contact_attrs: { first_name: "Clínica Santa", last_name: "Cruz SA", company_name: "Clínica Santa Cruz SA",
                     email: "calidad@clinicasantacruz.com",
                     phone_normalized: "+573159876543", kind: "company", city: "Bogotá", country: "CO" },
    opp_attrs: { title: "ISO 45001 Salud y Seguridad — Clínica Santa Cruz",
                 pipeline: pl, pipeline_stage: stages[3],
                 temperature: "hot", estimated_value: 24_000_000,
                 expected_close_on: 55.days.from_now.to_date, last_activity_at: 1.day.ago,
                 description: "Clínica de 300 camas, exigencia de la Secretaría de Salud. Propuesta revisada con el comité." },
    bant_data: { "budget" => { "amount" => 24_000_000 }, "authority" => { "role" => "director" },
                 "need" => { "intent" => "urgente" }, "timeline" => { "days" => 55 } },
    custom_fields: { "norma_iso" => "ISO 45001:2018", "sector_empresa" => "Salud",
                     "num_sedes" => "2", "estado_certificacion" => "En proceso OSHAS",
                     "organismo_certificador" => "Bureau Veritas" },
    source: srcs["Evento / Feria ISO"], owner: u.next,
    reminder: { subject: "Llamada de seguimiento propuesta", remind_at: 1.day.from_now }
  )

  # Oportunidad 3 — Warm, Calificada
  create_opp_with_bant(
    contact_attrs: { first_name: "Agrocampo", last_name: "Colombia SAS", company_name: "Agrocampo Colombia SAS",
                     email: "director@agrocampo.com.co",
                     phone_normalized: "+573204567890", kind: "company", city: "Medellín", country: "CO" },
    opp_attrs: { title: "ISO 22000 Inocuidad — Agrocampo Colombia",
                 pipeline: pl, pipeline_stage: stages[2],
                 temperature: "warm", estimated_value: 15_000_000,
                 expected_close_on: 90.days.from_now.to_date, last_activity_at: 5.days.ago,
                 description: "Procesadora de alimentos buscando ISO 22000 para exportar a la UE. Presupuesto en revisión." },
    bant_data: { "budget" => { "amount" => 15_000_000 }, "authority" => { "role" => "jefe" },
                 "need" => { "intent" => "alta" }, "timeline" => { "days" => 90 } },
    custom_fields: { "norma_iso" => "ISO 22000:2018", "sector_empresa" => "Agroindustria",
                     "num_sedes" => "1", "estado_certificacion" => "Sin certificar",
                     "organismo_certificador" => "" },
    source: srcs["Sitio Web ISWO"], owner: u.next
  )

  # Oportunidad 4 — Warm, Diagnóstico
  create_opp_with_bant(
    contact_attrs: { first_name: "Constructora", last_name: "Torres y Cia", company_name: "Torres & Cia Constructora",
                     email: "gerencia@torresconstruye.co",
                     phone_normalized: "+573112223344", kind: "company", city: "Barranquilla", country: "CO" },
    opp_attrs: { title: "ISO 9001 + ISO 14001 — Torres & Cia",
                 pipeline: pl, pipeline_stage: stages[1],
                 temperature: "warm", estimated_value: 28_000_000,
                 expected_close_on: 120.days.from_now.to_date, last_activity_at: 8.days.ago,
                 description: "Constructora mediana buscando doble certificación para licitaciones públicas distritales." },
    bant_data: { "budget" => { "amount" => 28_000_000 }, "authority" => { "role" => "lead" },
                 "need" => { "intent" => "explorando" }, "timeline" => { "days" => 120 } },
    custom_fields: { "norma_iso" => "ISO 9001 / ISO 14001", "sector_empresa" => "Construcción",
                     "num_sedes" => "4", "estado_certificacion" => "Sin certificar",
                     "organismo_certificador" => "" },
    source: srcs["Referido Consultor"], owner: u.next
  )

  # Oportunidad 5 — Won (cerrada este mes)
  create_opp_with_bant(
    contact_attrs: { first_name: "Tech Solutions", last_name: "Colombia SAS", company_name: "Tech Solutions Colombia SAS",
                     email: "ceo@techsolutions.co",
                     phone_normalized: "+573187654321", kind: "company", city: "Bogotá", country: "CO" },
    opp_attrs: { title: "ISO 27001 Seguridad Info — Tech Solutions",
                 pipeline: pl, pipeline_stage: stages.find { |s| s.closed_won },
                 temperature: "hot", estimated_value: 32_000_000,
                 expected_close_on: 10.days.ago.to_date,
                 closed_at: 10.days.ago, status: "won",
                 last_activity_at: 10.days.ago,
                 description: "Fintech que necesitaba ISO 27001 para operar con bancos. Contrato firmado, proyecto iniciado." },
    bant_data: { "budget" => { "amount" => 32_000_000 }, "authority" => { "role" => "ceo" },
                 "need" => { "intent" => "urgente" }, "timeline" => { "days" => 7 } },
    custom_fields: { "norma_iso" => "ISO 27001:2022", "sector_empresa" => "Tecnología",
                     "num_sedes" => "1", "estado_certificacion" => "Sin certificar",
                     "organismo_certificador" => "SGS" },
    source: srcs["Google Ads"], owner: u.next
  )
end

# ─────────────────────────────────────────────────────────────────────────────
# MI CASITA — Inmobiliaria
# ─────────────────────────────────────────────────────────────────────────────
puts "\n[micasita]"
ActsAsTenant.with_tenant(Tenant.find_by!(slug: "micasita")) do
  pl     = Pipeline.first!
  stages = PipelineStage.where(pipeline: pl).order(:position).to_a
  users  = User.where(role: %w[consultant manager]).to_a
  srcs   = LeadSource.all.index_by(&:name)
  u      = users.cycle

  # 1 — Hot, Oferta Presentada
  create_opp_with_bant(
    contact_attrs: { first_name: "Alejandro", last_name: "Murillo Ospina",
                     email: "alejandro.murillo@gmail.com",
                     phone_normalized: "+573001112233", kind: "person", city: "Medellín", country: "CO" },
    opp_attrs: { title: "Apto 3 hab El Poblado — Alejandro Murillo",
                 pipeline: pl, pipeline_stage: stages[4],
                 temperature: "hot", estimated_value: 480_000_000,
                 expected_close_on: 30.days.from_now.to_date, last_activity_at: 1.day.ago,
                 description: "Ejecutivo bancario, cupo hipotecario aprobado en Bancolombia. Visitó 2 inmuebles, eligió el 502." },
    bant_data: { "budget" => { "amount" => 480_000_000 }, "authority" => { "role" => "owner" },
                 "need" => { "intent" => "urgente" }, "timeline" => { "days" => 30 } },
    custom_fields: { "tipo_inmueble" => "Apartamento", "estrato" => "5", "ciudad" => "Medellín",
                     "barrio" => "El Poblado", "valor_comercial" => "480000000",
                     "credito_hipotecario" => "Sí", "area_m2" => "95" },
    source: srcs["Google Ads"], owner: u.next,
    reminder: { subject: "Confirmar visita al apto 502 torre norte", remind_at: 2.days.from_now }
  )

  # 2 — Hot, Visita Realizada
  create_opp_with_bant(
    contact_attrs: { first_name: "Sandra", last_name: "Jiménez Torres",
                     email: "sandra.jimenez@hotmail.com",
                     phone_normalized: "+573154445566", kind: "person", city: "Bogotá", country: "CO" },
    opp_attrs: { title: "Casa 4 hab Chía — Sandra Jiménez",
                 pipeline: pl, pipeline_stage: stages[3],
                 temperature: "hot", estimated_value: 650_000_000,
                 expected_close_on: 45.days.from_now.to_date, last_activity_at: 3.days.ago,
                 description: "Pareja con 2 hijos, venden casa en Usaquén. Quieren casa con jardín en Chía, crédito preaprobado." },
    bant_data: { "budget" => { "amount" => 650_000_000 }, "authority" => { "role" => "owner" },
                 "need" => { "intent" => "alta" }, "timeline" => { "days" => 45 } },
    custom_fields: { "tipo_inmueble" => "Casa", "estrato" => "4", "ciudad" => "Chía",
                     "barrio" => "Sindamanoy", "valor_comercial" => "650000000",
                     "credito_hipotecario" => "Sí", "area_m2" => "180" },
    source: srcs["WhatsApp"], owner: u.next,
    reminder: { subject: "Enviar comparativo de opciones en Chía", remind_at: 4.days.from_now }
  )

  # 3 — Warm, Calificada
  create_opp_with_bant(
    contact_attrs: { first_name: "Ricardo", last_name: "Vargas Leal",
                     email: "rvargas@empresa.com",
                     phone_normalized: "+573208887766", kind: "person", city: "Cali", country: "CO" },
    opp_attrs: { title: "Local Comercial CC Chipichape — Ricardo Vargas",
                 pipeline: pl, pipeline_stage: stages[2],
                 temperature: "warm", estimated_value: 320_000_000,
                 expected_close_on: 60.days.from_now.to_date, last_activity_at: 6.days.ago,
                 description: "Empresario con franquicia de comida rápida busca local en centro comercial." },
    bant_data: { "budget" => { "amount" => 320_000_000 }, "authority" => { "role" => "founder" },
                 "need" => { "intent" => "alta" }, "timeline" => { "days" => 60 } },
    custom_fields: { "tipo_inmueble" => "Local comercial", "estrato" => "N/A", "ciudad" => "Cali",
                     "barrio" => "Chipichape", "valor_comercial" => "320000000",
                     "credito_hipotecario" => "No", "area_m2" => "45" },
    source: srcs["Meta Ads — Facebook/Instagram"], owner: u.next
  )

  # 4 — Warm, Visita Agendada
  create_opp_with_bant(
    contact_attrs: { first_name: "Mónica", last_name: "Pérez Gutiérrez",
                     email: "monica.perez@gmail.com",
                     phone_normalized: "+573113334455", kind: "person", city: "Bogotá", country: "CO" },
    opp_attrs: { title: "Aparto-estudio Chapinero — Mónica Pérez",
                 pipeline: pl, pipeline_stage: stages[1],
                 temperature: "warm", estimated_value: 190_000_000,
                 expected_close_on: 90.days.from_now.to_date, last_activity_at: 12.days.ago,
                 description: "Joven profesional primer inmueble, explorando opciones de crédito con 3 bancos." },
    bant_data: { "budget" => { "amount" => 190_000_000 }, "authority" => { "role" => "owner" },
                 "need" => { "intent" => "explorando" }, "timeline" => { "days" => 90 } },
    custom_fields: { "tipo_inmueble" => "Apartamento", "estrato" => "3", "ciudad" => "Bogotá",
                     "barrio" => "Chapinero", "valor_comercial" => "190000000",
                     "credito_hipotecario" => "Sí", "area_m2" => "42" },
    source: srcs["Finca Raíz / Portales"], owner: u.next
  )

  # 5 — Won (cerrada este mes)
  create_opp_with_bant(
    contact_attrs: { first_name: "Familia", last_name: "Rodríguez Hernández",
                     email: "inversiones.rh@gmail.com",
                     phone_normalized: "+573185556677", kind: "person", city: "Medellín", country: "CO" },
    opp_attrs: { title: "Lote Envigado 800m² — Inversiones RH",
                 pipeline: pl, pipeline_stage: stages.find { |s| s.closed_won },
                 temperature: "hot", estimated_value: 1_200_000_000,
                 expected_close_on: 20.days.ago.to_date,
                 closed_at: 20.days.ago, status: "won",
                 last_activity_at: 20.days.ago,
                 description: "Inversionistas cerraron compra de lote para desarrollar proyecto residencial en Envigado." },
    bant_data: { "budget" => { "amount" => 1_200_000_000 }, "authority" => { "role" => "owner" },
                 "need" => { "intent" => "urgente" }, "timeline" => { "days" => 7 } },
    custom_fields: { "tipo_inmueble" => "Lote", "estrato" => "N/A", "ciudad" => "Envigado",
                     "barrio" => "El Dorado", "valor_comercial" => "1200000000",
                     "credito_hipotecario" => "No", "area_m2" => "800" },
    source: srcs["Referido Cliente"], owner: u.next
  )
end

# ─────────────────────────────────────────────────────────────────────────────
# LIBRANZAS
# ─────────────────────────────────────────────────────────────────────────────
puts "\n[libranzas]"
ActsAsTenant.with_tenant(Tenant.find_by!(slug: "libranzas")) do
  pl     = Pipeline.first!
  stages = PipelineStage.where(pipeline: pl).order(:position).to_a
  users  = User.where(role: %w[consultant manager]).to_a
  srcs   = LeadSource.all.index_by(&:name)
  u      = users.cycle

  # 1 — Hot, Aprobado (a punto de desembolsar)
  create_opp_with_bant(
    contact_attrs: { first_name: "Jorge", last_name: "Castillo Medina",
                     email: "jorge.castillo@ejercito.mil.co",
                     phone_normalized: "+573001234001", kind: "person",
                     city: "Bogotá", country: "CO", job_title: "Sargento" },
    opp_attrs: { title: "Libranza Militar $15M — Jorge Castillo",
                 pipeline: pl, pipeline_stage: stages[4],
                 temperature: "hot", estimated_value: 15_000_000,
                 expected_close_on: 10.days.from_now.to_date, last_activity_at: 1.day.ago,
                 description: "Militar activo con descuento nómina aprobado, pendiente firma de pagaré en Banco Agrario." },
    bant_data: { "budget" => { "amount" => 15_000_000 }, "authority" => { "role" => "owner" },
                 "need" => { "intent" => "urgente" }, "timeline" => { "days" => 10 } },
    custom_fields: { "empleador_nombre" => "Ejército Nacional", "empleador_nit" => "899999068",
                     "tipo_libranza" => "Militar activo", "salario_base" => "3200000",
                     "plazo_meses" => "60", "cuota_mensual" => "350000",
                     "descuento_ley" => "50", "entidad_financiera" => "Banco Agrario" },
    source: srcs["Call Center"], owner: u.next,
    reminder: { subject: "Enviar pagaré para firma — Castillo", remind_at: 2.days.from_now }
  )

  # 2 — Hot, Estudio de Crédito
  create_opp_with_bant(
    contact_attrs: { first_name: "Carmen", last_name: "López Suárez",
                     email: "carmen.lopez@ecopetrol.com",
                     phone_normalized: "+573154441122", kind: "person",
                     city: "Bogotá", country: "CO", job_title: "Analista Senior" },
    opp_attrs: { title: "Libranza Ecopetrol $28M — Carmen López",
                 pipeline: pl, pipeline_stage: stages[3],
                 temperature: "hot", estimated_value: 28_000_000,
                 expected_close_on: 25.days.from_now.to_date, last_activity_at: 2.days.ago,
                 description: "Empleada Ecopetrol 8 años antigüedad, excelente capacidad descuento. Docs completos." },
    bant_data: { "budget" => { "amount" => 28_000_000 }, "authority" => { "role" => "owner" },
                 "need" => { "intent" => "alta" }, "timeline" => { "days" => 25 } },
    custom_fields: { "empleador_nombre" => "Ecopetrol SA", "empleador_nit" => "899999068-7",
                     "tipo_libranza" => "Empresa convenio", "salario_base" => "5800000",
                     "plazo_meses" => "72", "cuota_mensual" => "520000",
                     "descuento_ley" => "40", "entidad_financiera" => "Bancolombia" },
    source: srcs["Empresa Convenio"], owner: u.next,
    reminder: { subject: "Solicitar colillas últimos 3 meses — López", remind_at: 3.days.from_now }
  )

  # 3 — Warm, Calificada
  create_opp_with_bant(
    contact_attrs: { first_name: "Ramiro", last_name: "Suárez Peña",
                     email: "ramiro.suarez@gmail.com",
                     phone_normalized: "+573208885544", kind: "person",
                     city: "Medellín", country: "CO", job_title: "Docente" },
    opp_attrs: { title: "Libranza Magisterio $10M — Ramiro Suárez",
                 pipeline: pl, pipeline_stage: stages[2],
                 temperature: "warm", estimated_value: 10_000_000,
                 expected_close_on: 45.days.from_now.to_date, last_activity_at: 7.days.ago,
                 description: "Docente del Magisterio, descuento de ley disponible. Documentación pendiente." },
    bant_data: { "budget" => { "amount" => 10_000_000 }, "authority" => { "role" => "owner" },
                 "need" => { "intent" => "alta" }, "timeline" => { "days" => 45 } },
    custom_fields: { "empleador_nombre" => "Sec. Educación Medellín", "empleador_nit" => "890905154",
                     "tipo_libranza" => "Magisterio", "salario_base" => "2900000",
                     "plazo_meses" => "48", "cuota_mensual" => "280000",
                     "descuento_ley" => "50", "entidad_financiera" => "Davivienda" },
    source: srcs["Referido"], owner: u.next
  )

  # 4 — Warm, Documentación
  create_opp_with_bant(
    contact_attrs: { first_name: "Adriana", last_name: "Mejía Ríos",
                     email: "adriana.mejia@policia.gov.co",
                     phone_normalized: "+573113330099", kind: "person",
                     city: "Cali", country: "CO", job_title: "Patrullera" },
    opp_attrs: { title: "Libranza Policía $8M — Adriana Mejía",
                 pipeline: pl, pipeline_stage: stages[1],
                 temperature: "warm", estimated_value: 8_000_000,
                 expected_close_on: 60.days.from_now.to_date, last_activity_at: 14.days.ago,
                 description: "Patrullera activa, pendiente carta laboral y certificado SICE." },
    bant_data: { "budget" => { "amount" => 8_000_000 }, "authority" => { "role" => "owner" },
                 "need" => { "intent" => "alta" }, "timeline" => { "days" => 60 } },
    custom_fields: { "empleador_nombre" => "Policía Nacional", "empleador_nit" => "899999126",
                     "tipo_libranza" => "Policía activo", "salario_base" => "2100000",
                     "plazo_meses" => "36", "cuota_mensual" => "290000",
                     "descuento_ley" => "50", "entidad_financiera" => "Banco Caja Social" },
    source: srcs["WhatsApp"], owner: u.next
  )

  # 5 — Won (desembolsado este mes)
  create_opp_with_bant(
    contact_attrs: { first_name: "Hernán", last_name: "Torres Quintero",
                     email: "hernan.torres@epm.com.co",
                     phone_normalized: "+573185553322", kind: "person",
                     city: "Medellín", country: "CO", job_title: "Técnico Senior" },
    opp_attrs: { title: "Libranza EPM $22M — Hernán Torres",
                 pipeline: pl, pipeline_stage: stages.find { |s| s.closed_won },
                 temperature: "hot", estimated_value: 22_000_000,
                 expected_close_on: 15.days.ago.to_date,
                 closed_at: 15.days.ago, status: "won",
                 last_activity_at: 15.days.ago,
                 description: "Empleado EPM 15 años antigüedad. Desembolso exitoso en Banco de Bogotá." },
    bant_data: { "budget" => { "amount" => 22_000_000 }, "authority" => { "role" => "owner" },
                 "need" => { "intent" => "urgente" }, "timeline" => { "days" => 7 } },
    custom_fields: { "empleador_nombre" => "EPM", "empleador_nit" => "890904996",
                     "tipo_libranza" => "Empresa convenio", "salario_base" => "4200000",
                     "plazo_meses" => "60", "cuota_mensual" => "480000",
                     "descuento_ley" => "40", "entidad_financiera" => "Banco de Bogotá" },
    source: srcs["Meta Ads"], owner: u.next
  )
end

# ─────────────────────────────────────────────────────────────────────────────
# Resumen
# ─────────────────────────────────────────────────────────────────────────────
puts "\nResumen:"
%w[iswo micasita libranzas].each do |slug|
  ActsAsTenant.with_tenant(Tenant.find_by(slug: slug)) do
    opps = Opportunity.all
    puts "  #{slug}: #{opps.count} opps | " \
         "hot=#{opps.where(temperature: 'hot').count} " \
         "warm=#{opps.where(temperature: 'warm').count} | " \
         "won=#{opps.where(status: 'won').count} | " \
         "recordatorios=#{Reminder.count}"
  end
end
puts "\nSeed completado."
