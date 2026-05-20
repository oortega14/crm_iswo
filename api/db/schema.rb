# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_05_20_000001) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "btree_gist"
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pg_trgm"
  enable_extension "pgcrypto"

  create_table "ad_integrations", force: :cascade do |t|
    t.string "account_identifier", comment: "ID público de la cuenta (ej. Meta Ad Account)"
    t.integer "consecutive_failures", default: 0, null: false
    t.datetime "created_at", null: false
    t.text "credentials_ciphertext", null: false, comment: "Cifrado con Lockbox"
    t.datetime "last_error_at"
    t.text "last_error_message"
    t.datetime "last_sync_at"
    t.jsonb "metadata", default: {}, null: false
    t.string "provider", null: false, comment: "meta | google | twilio | whatsapp_cloud"
    t.string "status", default: "active", null: false, comment: "active | paused | error | revoked"
    t.bigint "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.index ["status"], name: "index_ad_integrations_on_status"
    t.index ["tenant_id", "provider"], name: "index_ad_integrations_on_tenant_id_and_provider", unique: true
    t.index ["tenant_id"], name: "index_ad_integrations_on_tenant_id"
  end

  create_table "audit_events", force: :cascade do |t|
    t.string "action", null: false, comment: "login|logout|role_change|tenant_activate|integration_connect|…"
    t.datetime "created_at", null: false
    t.bigint "entity_id"
    t.string "entity_type", comment: "Clase del recurso afectado"
    t.string "ip_address"
    t.jsonb "metadata", default: {}, null: false
    t.bigint "tenant_id", comment: "NULL para eventos globales (super-admin)"
    t.string "user_agent"
    t.bigint "user_id", comment: "Actor del evento"
    t.index ["action"], name: "index_audit_events_on_action"
    t.index ["entity_type", "entity_id"], name: "index_audit_events_on_entity_type_and_entity_id"
    t.index ["tenant_id", "created_at"], name: "index_audit_events_on_tenant_id_and_created_at"
    t.index ["tenant_id"], name: "index_audit_events_on_tenant_id"
    t.index ["user_id"], name: "index_audit_events_on_user_id"
  end

  create_table "bant_criteria", force: :cascade do |t|
    t.integer "authority_weight", default: 25, null: false
    t.integer "budget_weight", default: 25, null: false
    t.datetime "created_at", null: false
    t.datetime "discarded_at", comment: "Soft-delete"
    t.integer "need_weight", default: 25, null: false
    t.bigint "tenant_id", null: false
    t.integer "threshold_qualified", default: 60, null: false, comment: "Score mínimo para considerar qualified"
    t.integer "timeline_weight", default: 25, null: false
    t.datetime "updated_at", null: false
    t.index ["tenant_id"], name: "index_bant_criteria_on_tenant_id", unique: true
    t.check_constraint "(budget_weight + authority_weight + need_weight + timeline_weight) = 100", name: "bant_weights_sum_100"
    t.check_constraint "threshold_qualified >= 0 AND threshold_qualified <= 100", name: "bant_threshold_range"
  end

  create_table "contacts", force: :cascade do |t|
    t.string "address"
    t.string "city"
    t.string "company_name"
    t.string "country", default: "CO"
    t.datetime "created_at", null: false
    t.jsonb "custom_fields", default: {}, null: false, comment: "Campos extra por tenant"
    t.datetime "discarded_at", comment: "Soft-delete"
    t.string "document_id", comment: "Cédula / NIT"
    t.string "email"
    t.string "first_name"
    t.string "job_title"
    t.string "kind", default: "person", null: false, comment: "person | company"
    t.string "last_name"
    t.text "notes"
    t.bigint "owner_user_id"
    t.string "phone_e164", comment: "Formato E.164 (+57…)"
    t.string "phone_normalized", comment: "Solo dígitos para matching"
    t.string "source_kind"
    t.string "source_label"
    t.bigint "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.index "((((COALESCE(first_name, ''::character varying))::text || ' '::text) || (COALESCE(last_name, ''::character varying))::text)) gin_trgm_ops", name: "index_contacts_on_full_name_trgm", using: :gin
    t.index "tenant_id, lower((email)::text)", name: "index_contacts_on_lower_email", where: "((email IS NOT NULL) AND (discarded_at IS NULL))"
    t.index ["discarded_at"], name: "index_contacts_on_discarded_at"
    t.index ["owner_user_id"], name: "index_contacts_on_owner_user_id"
    t.index ["phone_normalized"], name: "index_contacts_on_phone_normalized_trgm", opclass: :gin_trgm_ops, where: "((phone_normalized IS NOT NULL) AND (discarded_at IS NULL))", using: :gin
    t.index ["tenant_id", "document_id"], name: "index_contacts_on_tenant_id_and_document_id"
    t.index ["tenant_id", "email"], name: "index_contacts_on_tenant_id_and_email"
    t.index ["tenant_id", "owner_user_id"], name: "index_contacts_on_tenant_id_and_owner_user_id"
    t.index ["tenant_id", "phone_e164"], name: "index_contacts_on_tenant_id_and_phone_e164"
    t.index ["tenant_id"], name: "index_contacts_on_tenant_id"
  end

  create_table "duplicate_flags", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "detected_by_user_id", null: false
    t.bigint "duplicate_of_opportunity_id", null: false, comment: "La oportunidad existente (ganadora)"
    t.decimal "match_score", precision: 5, scale: 4, comment: "Similaridad trigram (0.0 - 1.0)"
    t.string "matched_on", null: false, comment: "phone | email | both"
    t.bigint "opportunity_id", null: false, comment: "La oportunidad nueva/detectada como duplicada"
    t.string "resolution", default: "pending", null: false, comment: "pending | reassigned | merged | ignored"
    t.text "resolution_note"
    t.datetime "resolved_at"
    t.bigint "resolved_by_user_id"
    t.bigint "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.index ["detected_by_user_id"], name: "index_duplicate_flags_on_detected_by_user_id"
    t.index ["duplicate_of_opportunity_id"], name: "index_duplicate_flags_on_duplicate_of_opportunity_id"
    t.index ["opportunity_id", "duplicate_of_opportunity_id"], name: "index_duplicate_flags_unique_pair", unique: true
    t.index ["opportunity_id"], name: "index_duplicate_flags_on_opportunity_id"
    t.index ["resolved_by_user_id"], name: "index_duplicate_flags_on_resolved_by_user_id"
    t.index ["tenant_id", "resolution"], name: "index_duplicate_flags_on_tenant_id_and_resolution"
    t.index ["tenant_id"], name: "index_duplicate_flags_on_tenant_id"
  end

  create_table "exports", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.text "error_message"
    t.datetime "expires_at"
    t.bigint "file_size"
    t.string "file_url"
    t.jsonb "filters", default: {}, null: false
    t.datetime "finished_at"
    t.string "format", null: false, comment: "csv | xlsx"
    t.string "resource", null: false, comment: "contacts | opportunities"
    t.integer "row_count"
    t.datetime "started_at"
    t.string "status", default: "queued", null: false, comment: "queued | running | succeeded | failed | expired"
    t.bigint "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["expires_at"], name: "index_exports_on_expires_at"
    t.index ["status"], name: "index_exports_on_status"
    t.index ["tenant_id", "user_id", "created_at"], name: "index_exports_on_tenant_id_and_user_id_and_created_at"
    t.index ["tenant_id"], name: "index_exports_on_tenant_id"
    t.index ["user_id"], name: "index_exports_on_user_id"
  end

  create_table "jwt_denylists", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "exp", null: false
    t.string "jti", null: false
    t.datetime "updated_at", null: false
    t.index ["exp"], name: "index_jwt_denylists_on_exp"
    t.index ["jti"], name: "index_jwt_denylists_on_jti", unique: true
  end

  create_table "landing_form_submissions", force: :cascade do |t|
    t.bigint "contact_id"
    t.datetime "created_at", null: false
    t.string "ip_address"
    t.bigint "landing_page_id", null: false
    t.bigint "opportunity_id"
    t.jsonb "payload", default: {}, null: false
    t.bigint "tenant_id", null: false
    t.string "user_agent"
    t.string "utm_campaign"
    t.string "utm_medium"
    t.string "utm_source"
    t.index ["contact_id"], name: "index_landing_form_submissions_on_contact_id"
    t.index ["landing_page_id"], name: "index_landing_form_submissions_on_landing_page_id"
    t.index ["opportunity_id"], name: "index_landing_form_submissions_on_opportunity_id"
    t.index ["tenant_id", "created_at"], name: "index_landing_form_submissions_on_tenant_id_and_created_at"
    t.index ["tenant_id"], name: "index_landing_form_submissions_on_tenant_id"
    t.index ["utm_campaign"], name: "index_landing_form_submissions_on_utm_campaign"
  end

  create_table "landing_pages", force: :cascade do |t|
    t.jsonb "content", default: {}, null: false, comment: "Estructura GrapeJS"
    t.datetime "created_at", null: false
    t.integer "lead_count", default: 0, null: false
    t.string "og_image_url"
    t.boolean "published", default: false, null: false
    t.datetime "published_at"
    t.string "seo_description"
    t.string "seo_title"
    t.string "slug", null: false
    t.jsonb "styles", default: {}, null: false
    t.bigint "tenant_id", null: false
    t.string "thumbnail_url"
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.integer "view_count", default: 0, null: false
    t.index ["tenant_id", "published"], name: "index_landing_pages_on_tenant_id_and_published"
    t.index ["tenant_id", "slug"], name: "index_landing_pages_on_tenant_id_and_slug", unique: true
    t.index ["tenant_id"], name: "index_landing_pages_on_tenant_id"
  end

  create_table "lead_sources", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.jsonb "config", default: {}, null: false, comment: "Parámetros (ej. campaign_id)"
    t.datetime "created_at", null: false
    t.string "kind", null: false, comment: "web|whatsapp|meta|google|manual|referral"
    t.string "name", null: false, comment: "Etiqueta visible al consultor"
    t.bigint "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.index ["tenant_id", "kind"], name: "index_lead_sources_on_tenant_id_and_kind"
    t.index ["tenant_id", "name"], name: "index_lead_sources_on_tenant_id_and_name", unique: true
    t.index ["tenant_id"], name: "index_lead_sources_on_tenant_id"
  end

  create_table "notifications", force: :cascade do |t|
    t.text "body"
    t.datetime "created_at", null: false
    t.string "kind", default: "reminder_due", null: false
    t.datetime "read_at"
    t.bigint "resource_id"
    t.string "resource_type"
    t.bigint "tenant_id", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["resource_type", "resource_id"], name: "index_notifications_on_resource_type_and_resource_id"
    t.index ["tenant_id"], name: "index_notifications_on_tenant_id"
    t.index ["user_id", "read_at"], name: "index_notifications_on_user_id_and_read_at"
    t.index ["user_id"], name: "index_notifications_on_user_id"
  end

  create_table "opportunities", force: :cascade do |t|
    t.integer "bant_score", default: 0, null: false
    t.string "close_reason", comment: "Motivo de cierre/perdida"
    t.datetime "closed_at", comment: "Cuándo entró a etapa terminal"
    t.bigint "contact_id", null: false
    t.datetime "created_at", null: false
    t.string "currency", default: "COP", null: false
    t.jsonb "custom_fields", default: {}, null: false, comment: "Campos extra por tenant"
    t.text "description"
    t.datetime "discarded_at", comment: "Soft-delete"
    t.decimal "estimated_value", precision: 14, scale: 2, default: "0.0"
    t.date "expected_close_on"
    t.datetime "last_activity_at", null: false
    t.bigint "lead_source_id"
    t.bigint "owner_user_id", null: false
    t.bigint "pipeline_id", null: false
    t.bigint "pipeline_stage_id", null: false
    t.boolean "qualified", default: false, null: false
    t.string "status", default: "new_lead", null: false, comment: "new_lead | contacted | qualified | proposal | won | lost"
    t.bigint "tenant_id", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["contact_id"], name: "index_opportunities_on_contact_id"
    t.index ["discarded_at"], name: "index_opportunities_on_discarded_at"
    t.index ["lead_source_id"], name: "index_opportunities_on_lead_source_id"
    t.index ["owner_user_id"], name: "index_opportunities_on_owner_user_id"
    t.index ["pipeline_id"], name: "index_opportunities_on_pipeline_id"
    t.index ["pipeline_stage_id"], name: "index_opportunities_on_pipeline_stage_id"
    t.index ["tenant_id", "last_activity_at"], name: "index_opportunities_on_tenant_id_and_last_activity_at"
    t.index ["tenant_id", "owner_user_id"], name: "index_opportunities_on_tenant_id_and_owner_user_id"
    t.index ["tenant_id", "pipeline_stage_id"], name: "index_opportunities_on_tenant_id_and_pipeline_stage_id"
    t.index ["tenant_id", "status"], name: "index_opportunities_on_tenant_id_and_status"
    t.index ["tenant_id"], name: "index_opportunities_on_tenant_id"
    t.check_constraint "bant_score >= 0 AND bant_score <= 100", name: "opportunities_bant_score_range"
    t.check_constraint "estimated_value >= 0::numeric", name: "opportunities_value_non_negative"
  end

  create_table "opportunity_logs", force: :cascade do |t|
    t.string "action", null: false, comment: "create | update | stage_change | assign | merge | export | note"
    t.jsonb "changes_data", default: {}, null: false, comment: "Diff de atributos; `changes` está reservado en AR"
    t.datetime "created_at", null: false
    t.string "ip_address"
    t.text "note"
    t.bigint "opportunity_id"
    t.bigint "tenant_id", null: false
    t.string "user_agent"
    t.bigint "user_id", comment: "Autor del cambio"
    t.index ["action"], name: "index_opportunity_logs_on_action"
    t.index ["opportunity_id", "created_at"], name: "index_opportunity_logs_on_opportunity_id_and_created_at"
    t.index ["opportunity_id"], name: "index_opportunity_logs_on_opportunity_id"
    t.index ["tenant_id", "created_at"], name: "index_opportunity_logs_on_tenant_id_and_created_at"
    t.index ["tenant_id"], name: "index_opportunity_logs_on_tenant_id"
    t.index ["user_id"], name: "index_opportunity_logs_on_user_id"
  end

  create_table "pipeline_stages", force: :cascade do |t|
    t.boolean "closed_lost", default: false, null: false
    t.boolean "closed_won", default: false, null: false
    t.string "color", default: "#94A3B8"
    t.datetime "created_at", null: false
    t.datetime "discarded_at", comment: "Soft-delete"
    t.string "name", null: false
    t.bigint "pipeline_id", null: false
    t.integer "position", default: 0, null: false
    t.integer "probability", default: 0, null: false, comment: "0-100"
    t.bigint "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.index ["pipeline_id", "name"], name: "index_pipeline_stages_on_pipeline_id_and_name", unique: true
    t.index ["pipeline_id", "position"], name: "index_pipeline_stages_on_pipeline_id_and_position"
    t.index ["pipeline_id"], name: "index_pipeline_stages_on_pipeline_id"
    t.index ["tenant_id"], name: "index_pipeline_stages_on_tenant_id"
    t.check_constraint "probability >= 0 AND probability <= 100", name: "pipeline_stages_probability_range"
  end

  create_table "pipelines", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.string "description"
    t.datetime "discarded_at", comment: "Soft-delete"
    t.boolean "is_default", default: false, null: false
    t.string "name", null: false
    t.integer "position", default: 0, null: false
    t.bigint "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.index ["discarded_at"], name: "index_pipelines_on_discarded_at"
    t.index ["tenant_id", "is_default"], name: "index_pipelines_one_default_per_tenant", unique: true, where: "(is_default = true)"
    t.index ["tenant_id", "name"], name: "index_pipelines_on_tenant_id_and_name", unique: true
    t.index ["tenant_id"], name: "index_pipelines_on_tenant_id"
  end

  create_table "referral_networks", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.integer "depth", default: 1, null: false, comment: "Profundidad desde el root"
    t.bigint "referred_user_id", null: false
    t.bigint "referrer_user_id", null: false
    t.bigint "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.index ["referred_user_id"], name: "index_referral_networks_on_referred_user_id"
    t.index ["referrer_user_id"], name: "index_referral_networks_on_referrer_user_id"
    t.index ["tenant_id", "referrer_user_id", "depth"], name: "idx_on_tenant_id_referrer_user_id_depth_e6e45b3816"
    t.index ["tenant_id", "referrer_user_id", "referred_user_id"], name: "index_referral_networks_unique_pair", unique: true
    t.index ["tenant_id"], name: "index_referral_networks_on_tenant_id"
    t.check_constraint "referrer_user_id <> referred_user_id", name: "referral_networks_no_self_referral"
  end

  create_table "reminders", force: :cascade do |t|
    t.integer "attempts", default: 0, null: false
    t.string "channel", null: false, comment: "email | whatsapp | in_app"
    t.datetime "created_at", null: false
    t.text "last_error"
    t.text "message"
    t.bigint "opportunity_id", null: false
    t.datetime "remind_at", null: false
    t.datetime "sent_at"
    t.string "status", default: "pending", null: false, comment: "pending | sent | failed | done"
    t.string "subject"
    t.bigint "tenant_id", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false, comment: "Destinatario del recordatorio"
    t.index ["opportunity_id", "remind_at"], name: "index_reminders_on_opportunity_id_and_remind_at"
    t.index ["opportunity_id"], name: "index_reminders_on_opportunity_id"
    t.index ["status", "remind_at"], name: "index_reminders_dispatch"
    t.index ["tenant_id", "user_id", "status"], name: "index_reminders_on_tenant_id_and_user_id_and_status"
    t.index ["tenant_id"], name: "index_reminders_on_tenant_id"
    t.index ["user_id"], name: "index_reminders_on_user_id"
  end

  create_table "tenants", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.string "currency", default: "COP", null: false
    t.datetime "discarded_at", comment: "Soft-delete"
    t.string "legal_name", comment: "Razón social"
    t.string "locale", default: "es-CO", null: false
    t.string "logo_url"
    t.string "name", null: false, comment: "Nombre comercial del tenant"
    t.string "primary_color", default: "#0F172A"
    t.jsonb "settings", default: {}, null: false, comment: "Feature flags y config por tenant"
    t.string "slug", null: false, comment: "Subdominio único (ej. micasita)"
    t.string "tax_id", comment: "NIT / RUT"
    t.string "timezone", default: "America/Bogota", null: false
    t.datetime "updated_at", null: false
    t.index ["active"], name: "index_tenants_on_active"
    t.index ["discarded_at"], name: "index_tenants_on_discarded_at"
    t.index ["slug"], name: "index_tenants_on_slug", unique: true
    t.index ["tax_id"], name: "index_tenants_on_tax_id", unique: true, where: "(tax_id IS NOT NULL)"
  end

  create_table "users", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.string "avatar_url"
    t.datetime "confirmation_sent_at"
    t.string "confirmation_token"
    t.datetime "confirmed_at"
    t.datetime "created_at", null: false
    t.datetime "current_sign_in_at"
    t.string "current_sign_in_ip"
    t.datetime "discarded_at", comment: "Soft-delete"
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.integer "failed_attempts", default: 0, null: false
    t.datetime "last_sign_in_at"
    t.string "last_sign_in_ip"
    t.datetime "locked_at"
    t.string "name", null: false, comment: "Nombre completo del consultor"
    t.string "phone", comment: "Teléfono de contacto"
    t.jsonb "preferences", default: {}, null: false
    t.datetime "remember_created_at"
    t.datetime "reset_password_sent_at"
    t.string "reset_password_token"
    t.string "role", default: "consultant", null: false, comment: "admin | manager | consultant | viewer"
    t.integer "sign_in_count", default: 0, null: false
    t.bigint "tenant_id", null: false
    t.string "unconfirmed_email"
    t.string "unlock_token"
    t.datetime "updated_at", null: false
    t.index ["confirmation_token"], name: "index_users_on_confirmation_token", unique: true, where: "(confirmation_token IS NOT NULL)"
    t.index ["discarded_at"], name: "index_users_on_discarded_at"
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true, where: "(reset_password_token IS NOT NULL)"
    t.index ["tenant_id", "active"], name: "index_users_on_tenant_id_and_active"
    t.index ["tenant_id", "email"], name: "index_users_on_tenant_and_email", unique: true
    t.index ["tenant_id", "role"], name: "index_users_on_tenant_id_and_role"
    t.index ["tenant_id"], name: "index_users_on_tenant_id"
    t.index ["unlock_token"], name: "index_users_on_unlock_token", unique: true, where: "(unlock_token IS NOT NULL)"
  end

  create_table "whatsapp_messages", force: :cascade do |t|
    t.text "body"
    t.bigint "contact_id"
    t.datetime "created_at", null: false
    t.datetime "delivered_at"
    t.string "direction", null: false, comment: "in | out"
    t.text "error_message"
    t.string "from_number", null: false
    t.string "media_content_type"
    t.string "media_url"
    t.bigint "opportunity_id"
    t.string "provider", null: false, comment: "twilio | whatsapp_cloud"
    t.string "provider_message_id"
    t.jsonb "raw_payload", default: {}, null: false
    t.datetime "read_at"
    t.datetime "sent_at"
    t.string "status", default: "pending", null: false, comment: "pending | queued | sent | delivered | read | failed"
    t.bigint "tenant_id", null: false
    t.string "to_number", null: false
    t.datetime "updated_at", null: false
    t.index ["contact_id"], name: "index_whatsapp_messages_on_contact_id"
    t.index ["opportunity_id", "created_at"], name: "index_whatsapp_messages_on_opportunity_id_and_created_at"
    t.index ["opportunity_id"], name: "index_whatsapp_messages_on_opportunity_id"
    t.index ["provider", "provider_message_id"], name: "index_whatsapp_messages_unique_provider_id", unique: true, where: "(provider_message_id IS NOT NULL)"
    t.index ["status"], name: "index_whatsapp_messages_on_status"
    t.index ["tenant_id", "created_at"], name: "index_whatsapp_messages_on_tenant_id_and_created_at"
    t.index ["tenant_id"], name: "index_whatsapp_messages_on_tenant_id"
  end

  add_foreign_key "ad_integrations", "tenants"
  add_foreign_key "audit_events", "tenants"
  add_foreign_key "audit_events", "users"
  add_foreign_key "bant_criteria", "tenants"
  add_foreign_key "contacts", "tenants"
  add_foreign_key "contacts", "users", column: "owner_user_id"
  add_foreign_key "duplicate_flags", "opportunities"
  add_foreign_key "duplicate_flags", "opportunities", column: "duplicate_of_opportunity_id"
  add_foreign_key "duplicate_flags", "tenants"
  add_foreign_key "duplicate_flags", "users", column: "detected_by_user_id"
  add_foreign_key "duplicate_flags", "users", column: "resolved_by_user_id"
  add_foreign_key "exports", "tenants"
  add_foreign_key "exports", "users"
  add_foreign_key "landing_form_submissions", "contacts"
  add_foreign_key "landing_form_submissions", "landing_pages"
  add_foreign_key "landing_form_submissions", "opportunities"
  add_foreign_key "landing_form_submissions", "tenants"
  add_foreign_key "landing_pages", "tenants"
  add_foreign_key "lead_sources", "tenants"
  add_foreign_key "notifications", "tenants"
  add_foreign_key "notifications", "users"
  add_foreign_key "opportunities", "contacts"
  add_foreign_key "opportunities", "lead_sources"
  add_foreign_key "opportunities", "pipeline_stages"
  add_foreign_key "opportunities", "pipelines"
  add_foreign_key "opportunities", "tenants"
  add_foreign_key "opportunities", "users", column: "owner_user_id"
  add_foreign_key "opportunity_logs", "opportunities"
  add_foreign_key "opportunity_logs", "tenants"
  add_foreign_key "opportunity_logs", "users"
  add_foreign_key "pipeline_stages", "pipelines"
  add_foreign_key "pipeline_stages", "tenants"
  add_foreign_key "pipelines", "tenants"
  add_foreign_key "referral_networks", "tenants"
  add_foreign_key "referral_networks", "users", column: "referred_user_id"
  add_foreign_key "referral_networks", "users", column: "referrer_user_id"
  add_foreign_key "reminders", "opportunities"
  add_foreign_key "reminders", "tenants"
  add_foreign_key "reminders", "users"
  add_foreign_key "users", "tenants"
  add_foreign_key "whatsapp_messages", "contacts"
  add_foreign_key "whatsapp_messages", "opportunities"
  add_foreign_key "whatsapp_messages", "tenants"
end
