import { useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { X, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from '@tanstack/react-router'
import api, { formatRailsError } from '@/lib/api'
import { useAuthStore, useTenant } from '@/stores/auth'
import {
  jsonApiIncluded,
  jsonApiPrimaryList,
  jsonApiPrimaryOne,
  mapOpportunityResource,
  mapPipelineResource,
} from '@/lib/opportunityApi'
import { queryKeys } from '@/lib/queryClient'
import { debounce, formatDate } from '@/lib/utils'
import { TemperatureSelector } from './TemperatureSelector'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import type { LeadSource, TenantFieldDefinition } from '@/types'

function mapFieldDefs(raw: unknown): TenantFieldDefinition[] {
  const items = (raw as { data?: unknown[] })?.data ?? []
  return items.map((item) => {
    const r = item as { id?: string; attributes?: Record<string, unknown> }
    const a = r.attributes ?? {}
    return {
      id:         String(r.id ?? ''),
      key:        String(a.key ?? ''),
      label:      String(a.label ?? ''),
      field_type: (a.field_type as TenantFieldDefinition['field_type']) ?? 'text',
      options:    Array.isArray(a.options) ? (a.options as string[]) : [],
      required:   Boolean(a.required),
      entity:     (a.entity as TenantFieldDefinition['entity']) ?? 'opportunity',
      position:   Number(a.position ?? 0),
      active:     Boolean(a.active ?? true),
    }
  })
}

const opportunitySchema = z.object({
  contact_name: z.string().min(1, 'El nombre es requerido').default(''),
  contact_email: z.string().email('Correo inválido').optional().or(z.literal('')),
  contact_phone: z.string().min(7, 'Teléfono inválido').optional().or(z.literal('')),
  company_name: z.string().optional(),
  estimated_value: z.preprocess(
    (v) => (typeof v === 'number' && Number.isNaN(v) ? 0 : v),
    z.number().min(0, 'El valor debe ser positivo')
  ),
  pipeline_id: z.string().min(1, 'Selecciona un pipeline'),
  stage_id: z.string().min(1, 'Selecciona una etapa'),
  notes: z.string().optional(),
  lead_source_id: z.string().optional(),
  expected_close_on: z.string().optional(),
  temperature: z.enum(['cold', 'warm', 'hot']).default('cold'),
  owner_id: z.string().optional(),
})

type OpportunityForm = z.infer<typeof opportunitySchema>

interface DuplicateInfo {
  exists: boolean
  opportunity?: {
    id: string
    contact_name: string
    owner_name: string
    created_at: string
  }
}

interface PrefilledContact {
  id: string
  name: string
}

interface QuickAddOpportunityProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prefilledContact?: PrefilledContact
}

export function QuickAddOpportunity({ open, onOpenChange, prefilledContact }: QuickAddOpportunityProps) {
  const queryClient = useQueryClient()
  const tenant = useTenant()
  const userRole = useAuthStore((s) => s.user?.role)
  const canAssign = userRole === 'admin' || userRole === 'manager'
  const [duplicatePhone, setDuplicatePhone] = useState<DuplicateInfo | null>(null)
  const [duplicateEmail, setDuplicateEmail] = useState<DuplicateInfo | null>(null)
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({})

  // Fetch pipelines when the panel is open (tras bootstrap del tenant deben existir embudos/etapas)
  const {
    data: pipelines = [],
    isLoading: pipelinesLoading,
    isFetching: pipelinesFetching,
  } = useQuery({
    queryKey: queryKeys.pipelines.all,
    queryFn: async () => {
      const response = await api.get('/pipelines')
      const rows = jsonApiPrimaryList(response.data)
      return rows.filter((r) => r.id).map(mapPipelineResource)
    },
    enabled: open,
    staleTime: 60 * 1000,
  })

  const { data: leadSources } = useQuery({
    queryKey: ['leadSources', 'active'] as const,
    queryFn: async (): Promise<LeadSource[]> => {
      const response = await api.get('/lead_sources', { params: { active: true } })
      return jsonApiPrimaryList(response.data).map((r) => ({
        id: String(r.id),
        name: String(r.attributes?.name ?? ''),
        kind: String(r.attributes?.kind ?? 'manual') as LeadSource['kind'],
        active: Boolean(r.attributes?.active ?? true),
        opportunities_count: Number(r.attributes?.opportunities_count ?? 0),
        created_at: String(r.attributes?.created_at ?? ''),
      }))
    },
    enabled: open,
    staleTime: 60 * 1000,
  })

  const { data: fieldDefs = [] } = useQuery({
    queryKey: ['tenant_field_definitions', 'opportunity'],
    queryFn: async () => {
      const res = await api.get('/tenant_field_definitions', { params: { entity: 'opportunity' } })
      return mapFieldDefs(res.data)
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  const { data: users = [] } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => {
      const response = await api.get('/users')
      return jsonApiPrimaryList(response.data)
        .filter((r) => r.id)
        .map((r) => ({
          id: String(r.id),
          name: String(r.attributes?.name ?? r.attributes?.email ?? 'Usuario'),
        }))
    },
    enabled: open && canAssign,
    staleTime: 60_000,
  })

  const defaultPipeline = pipelines?.find((p) => p.is_default) || pipelines?.[0]

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<OpportunityForm>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      company_name: '',
      estimated_value: 0,
      pipeline_id: defaultPipeline?.id || '',
      stage_id: defaultPipeline?.stages?.[0]?.id || '',
      notes: '',
      temperature: 'cold',
    },
  })

  // Update default values when pipelines load
  useEffect(() => {
    if (defaultPipeline) {
      setValue('pipeline_id', defaultPipeline.id)
      if (defaultPipeline.stages?.[0]) {
        setValue('stage_id', defaultPipeline.stages[0].id)
      }
    }
  }, [defaultPipeline, setValue])

  // Cuando hay contacto preseleccionado, contact_name se rellena para que pase la validación
  useEffect(() => {
    if (prefilledContact) {
      setValue('contact_name', prefilledContact.name)
    }
  }, [prefilledContact, setValue])

  const selectedPipelineId = watch('pipeline_id')
  const selectedPipeline = pipelines?.find((p) => p.id === selectedPipelineId)

  // Si cambia el embudo, la etapa debe seguir perteneciendo a ese embudo (evita 422 en el servidor).
  useEffect(() => {
    if (!selectedPipelineId || !pipelines?.length) return
    const p = pipelines.find((x) => x.id === selectedPipelineId)
    if (!p?.stages?.length) return
    const currentStageId = getValues('stage_id')
    const stillValid = p.stages.some((s) => s.id === currentStageId)
    if (!stillValid) setValue('stage_id', p.stages[0].id)
  }, [selectedPipelineId, pipelines, setValue, getValues])

  // Check for duplicates
  const checkDuplicate = useCallback(
    debounce(async (phone?: string, email?: string) => {
      if (!phone && !email) return

      try {
        const params = new URLSearchParams()
        if (phone) params.append('phone', phone)
        if (email) params.append('email', email)

        const response = await api.get<{ data: DuplicateInfo }>(
          `/contacts/check_duplicates?${params.toString()}`
        )

        if (phone) setDuplicatePhone(response.data.data)
        if (email) setDuplicateEmail(response.data.data)
      } catch {
        // Ignore errors
      }
    }, 500),
    []
  )

  const phone = watch('contact_phone')
  const email = watch('contact_email')

  useEffect(() => {
    if (phone && phone.length >= 7) {
      checkDuplicate(phone, undefined)
    } else {
      setDuplicatePhone(null)
    }
  }, [phone, checkDuplicate])

  useEffect(() => {
    if (email && email.includes('@')) {
      checkDuplicate(undefined, email)
    } else {
      setDuplicateEmail(null)
    }
  }, [email, checkDuplicate])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: OpportunityForm) => {
      const extraFields = Object.keys(customFields).length > 0 ? { custom_fields: customFields } : {}
      const ownerField = data.owner_id ? { owner_id: data.owner_id } : {}
      const body = prefilledContact
        ? {
            contact_id: prefilledContact.id,
            estimated_value: data.estimated_value,
            pipeline_id: data.pipeline_id,
            pipeline_stage_id: data.stage_id,
            notes: data.notes || undefined,
            lead_source_id: data.lead_source_id || undefined,
            expected_close_on: data.expected_close_on || undefined,
            temperature: data.temperature,
            ...ownerField,
            ...extraFields,
          }
        : {
            contact_name: data.contact_name,
            contact_email: data.contact_email || undefined,
            contact_phone: data.contact_phone || undefined,
            company_name: data.company_name || undefined,
            estimated_value: data.estimated_value,
            pipeline_id: data.pipeline_id,
            pipeline_stage_id: data.stage_id,
            notes: data.notes || undefined,
            lead_source_id: data.lead_source_id || undefined,
            expected_close_on: data.expected_close_on || undefined,
            temperature: data.temperature,
            ...ownerField,
            ...extraFields,
          }
      const response = await api.post('/opportunities', { opportunity: body })
      const raw = jsonApiPrimaryOne(response.data)
      if (!raw?.id) {
        throw new Error('Respuesta inválida del servidor al crear la oportunidad')
      }
      return mapOpportunityResource(raw, jsonApiIncluded(response.data))
    },
    onSuccess: () => {
      toast.success('Oportunidad creada exitosamente')
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      reset()
      setCustomFields({})
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(formatRailsError(error, 'Error al crear la oportunidad'))
    },
  })

  const onSubmit = (data: OpportunityForm) => {
    createMutation.mutate(data)
  }

  // Solo bloquear si el contacto existente ya tiene una oportunidad abierta.
  // Si el contacto existe pero no tiene oportunidad, el backend lo reutiliza sin problema.
  const duplicateWarning =
    (duplicatePhone?.exists && !!duplicatePhone.opportunity) ||
    (duplicateEmail?.exists && !!duplicateEmail.opportunity)
  const duplicateInfo = duplicatePhone?.opportunity ? duplicatePhone : duplicateEmail

  const pipelinesReady = !pipelinesLoading && !pipelinesFetching
  const noPipelines = pipelinesReady && pipelines.length === 0
  const noStages =
    pipelinesReady &&
    pipelines.length > 0 &&
    !(selectedPipeline?.stages && selectedPipeline.stages.length > 0)

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => onOpenChange(false)}
          />

          {/* Slide-over panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background border-l shadow-xl"
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <h2 className="text-lg font-semibold">Nueva Oportunidad</h2>
                  {prefilledContact && (
                    <p className="text-sm text-muted-foreground">Para: {prefilledContact.name}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>

              {/* Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void handleSubmit(onSubmit)(e)
                }}
                className="flex-1 overflow-y-auto p-4"
              >
                <div className="flex flex-col gap-4">
                  {/* Campos de contacto: solo cuando NO hay contacto preseleccionado */}
                  {!prefilledContact && (
                    <>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="contact_name">Nombre del contacto *</Label>
                        <Input
                          id="contact_name"
                          placeholder="Juan Pérez"
                          {...register('contact_name')}
                          aria-invalid={!!errors.contact_name}
                        />
                        {errors.contact_name && (
                          <p className="text-sm text-destructive">
                            {errors.contact_name.message}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="contact_phone">Teléfono</Label>
                        <Input
                          id="contact_phone"
                          type="tel"
                          placeholder="+57 300 123 4567"
                          {...register('contact_phone')}
                        />
                        {errors.contact_phone && (
                          <p className="text-sm text-destructive">
                            {errors.contact_phone.message}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="contact_email">Correo electrónico</Label>
                        <Input
                          id="contact_email"
                          type="email"
                          placeholder="juan@ejemplo.com"
                          {...register('contact_email')}
                        />
                        {errors.contact_email && (
                          <p className="text-sm text-destructive">
                            {errors.contact_email.message}
                          </p>
                        )}
                      </div>

                      {duplicateWarning && duplicateInfo?.opportunity && (
                        <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50 p-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                            <div className="text-sm">
                              <p className="font-medium text-amber-800 dark:text-amber-200">
                                Este prospecto ya está registrado
                              </p>
                              <p className="text-amber-700 dark:text-amber-300 mt-1">
                                por <strong>{duplicateInfo.opportunity.owner_name}</strong> desde{' '}
                                {formatDate(duplicateInfo.opportunity.created_at)}.
                                Contacta al administrador para reasignarlo.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="company_name">Empresa</Label>
                        <Input
                          id="company_name"
                          placeholder="Empresa S.A.S."
                          {...register('company_name')}
                        />
                      </div>
                    </>
                  )}

                  {/* Estimated value */}
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="estimated_value">Valor estimado ({tenant?.currency ?? 'COP'})</Label>
                    <Input
                      id="estimated_value"
                      type="number"
                      placeholder="50000000"
                      {...register('estimated_value', { valueAsNumber: true })}
                      aria-invalid={!!errors.estimated_value}
                    />
                    {errors.estimated_value && (
                      <p className="text-sm text-destructive">
                        {errors.estimated_value.message}
                      </p>
                    )}
                  </div>

                  {/* Fecha de cierre estimada */}
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="expected_close_on">Fecha de cierre estimada</Label>
                    <Input
                      id="expected_close_on"
                      type="date"
                      {...register('expected_close_on')}
                    />
                  </div>

                  {/* Temperatura */}
                  <div className="flex flex-col gap-2">
                    <Label>Temperatura del lead</Label>
                    <TemperatureSelector
                      value={watch('temperature') ?? 'cold'}
                      onChange={(temp) => setValue('temperature', temp)}
                    />
                  </div>

                  {/* Pipeline / etapa */}
                  {(pipelinesLoading || pipelinesFetching) && (
                    <p className="text-sm text-muted-foreground">Cargando pipelines y etapas…</p>
                  )}

                  {noPipelines && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                      <p className="font-medium">No hay ningún pipeline configurado para este tenant.</p>
                      <p className="mt-1 text-amber-800 dark:text-amber-200">
                        Crea uno en{' '}
                        <Link
                          to="/settings/pipelines"
                          className="font-medium underline underline-offset-2"
                          onClick={() => onOpenChange(false)}
                        >
                          Ajustes → Pipelines
                        </Link>
                        , o reinicia el servidor Rails si acabas de actualizar el proyecto (se crean datos de
                        desarrollo al arrancar).
                      </p>
                    </div>
                  )}

                  {noStages && !noPipelines && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                      <p className="font-medium">Este pipeline no tiene etapas.</p>
                      <p className="mt-1">
                        <Link
                          to="/settings/pipelines"
                          className="font-medium underline underline-offset-2"
                          onClick={() => onOpenChange(false)}
                        >
                          Configura etapas
                        </Link>
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="pipeline_id">Pipeline</Label>
                    <select
                      id="pipeline_id"
                      disabled={pipelinesLoading || noPipelines}
                      {...register('pipeline_id')}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                    >
                      {pipelines.length === 0 ? (
                        <option value="">—</option>
                      ) : (
                        pipelines.map((pipeline) => (
                          <option key={pipeline.id} value={pipeline.id}>
                            {pipeline.name}
                            {pipeline.is_default && ' (Por defecto)'}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="stage_id">Etapa</Label>
                    <select
                      id="stage_id"
                      disabled={pipelinesLoading || noPipelines || noStages}
                      {...register('stage_id')}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                    >
                      {!selectedPipeline?.stages?.length ? (
                        <option value="">—</option>
                      ) : (
                        selectedPipeline.stages.map((stage) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Notes */}
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="notes">Notas</Label>
                    <textarea
                      id="notes"
                      rows={3}
                      placeholder="Notas adicionales..."
                      {...register('notes')}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                    />
                  </div>

                  {/* Campos personalizados por vertical (RFC F5) */}
                  {fieldDefs.length > 0 && (
                    <>
                      <div className="border-t pt-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                          Datos del negocio
                        </p>
                        <div className="flex flex-col gap-3">
                          {fieldDefs.map((def) => {
                            const val = customFields[def.key]

                            if (def.field_type === 'boolean') {
                              return (
                                <div key={def.key} className="flex items-center justify-between">
                                  <Label className="text-sm font-normal">{def.label}</Label>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(val)}
                                    onChange={(e) =>
                                      setCustomFields((prev) => ({ ...prev, [def.key]: e.target.checked }))
                                    }
                                    className="size-4 rounded border-input accent-primary"
                                  />
                                </div>
                              )
                            }

                            if (def.field_type === 'select') {
                              return (
                                <div key={def.key} className="flex flex-col gap-1.5">
                                  <Label htmlFor={`cf_${def.key}`} className="text-sm font-normal">
                                    {def.label}{def.required && ' *'}
                                  </Label>
                                  <select
                                    id={`cf_${def.key}`}
                                    value={String(val ?? '')}
                                    onChange={(e) =>
                                      setCustomFields((prev) => ({ ...prev, [def.key]: e.target.value }))
                                    }
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                  >
                                    <option value="">— Seleccionar —</option>
                                    {def.options.map((opt) => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                </div>
                              )
                            }

                            return (
                              <div key={def.key} className="flex flex-col gap-1.5">
                                <Label htmlFor={`cf_${def.key}`} className="text-sm font-normal">
                                  {def.label}{def.required && ' *'}
                                </Label>
                                <Input
                                  id={`cf_${def.key}`}
                                  type={
                                    def.field_type === 'date' ? 'date'
                                    : def.field_type === 'number' || def.field_type === 'currency' ? 'number'
                                    : 'text'
                                  }
                                  value={String(val ?? '')}
                                  onChange={(e) =>
                                    setCustomFields((prev) => ({ ...prev, [def.key]: e.target.value }))
                                  }
                                  placeholder={def.required ? `${def.label} *` : def.label}
                                  className="h-9"
                                />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Consultor asignado — solo admin/manager */}
                  {canAssign && users.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="owner_id">Consultor asignado</Label>
                      <select
                        id="owner_id"
                        {...register('owner_id')}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">— Yo mismo —</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Origen */}
                  {(leadSources ?? []).length > 0 && (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="lead_source_id">Origen</Label>
                      <select
                        id="lead_source_id"
                        {...register('lead_source_id')}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">— Sin origen —</option>
                        {(leadSources ?? []).map((ls) => (
                          <option key={ls.id} value={ls.id}>
                            {ls.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </form>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={
                    createMutation.isPending ||
                    (!prefilledContact && duplicateWarning) ||
                    noPipelines ||
                    noStages ||
                    pipelinesLoading ||
                    pipelinesFetching
                  }
                  onClick={handleSubmit(onSubmit)}
                >
                  {createMutation.isPending ? (
                    <>
                      <Spinner className="size-4" />
                      Creando...
                    </>
                  ) : (
                    'Crear Oportunidad'
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
