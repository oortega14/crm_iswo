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
import {
  jsonApiIncluded,
  jsonApiPrimaryList,
  jsonApiPrimaryOne,
  mapOpportunityResource,
  mapPipelineResource,
} from '@/lib/opportunityApi'
import { queryKeys } from '@/lib/queryClient'
import { debounce, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import type { Pipeline } from '@/types'

const opportunitySchema = z.object({
  contact_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
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

interface QuickAddOpportunityProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickAddOpportunity({ open, onOpenChange }: QuickAddOpportunityProps) {
  const queryClient = useQueryClient()
  const [duplicatePhone, setDuplicatePhone] = useState<DuplicateInfo | null>(null)
  const [duplicateEmail, setDuplicateEmail] = useState<DuplicateInfo | null>(null)

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
      const response = await api.post('/opportunities', {
        opportunity: {
          contact_name: data.contact_name,
          contact_email: data.contact_email || undefined,
          contact_phone: data.contact_phone || undefined,
          company_name: data.company_name || undefined,
          estimated_value: data.estimated_value,
          pipeline_id: data.pipeline_id,
          pipeline_stage_id: data.stage_id,
          notes: data.notes || undefined,
        },
      })
      const raw = jsonApiPrimaryOne(response.data)
      if (!raw?.id) {
        throw new Error('Respuesta inválida del servidor al crear la oportunidad')
      }
      return mapOpportunityResource(raw, jsonApiIncluded(response.data))
    },
    onSuccess: () => {
      toast.success('Oportunidad creada exitosamente')
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.pipeline })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.activity })
      reset()
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      toast.error(formatRailsError(error, 'Error al crear la oportunidad'))
    },
  })

  const onSubmit = (data: OpportunityForm) => {
    createMutation.mutate(data)
  }

  const duplicateWarning = duplicatePhone?.exists || duplicateEmail?.exists
  const duplicateInfo = duplicatePhone?.exists ? duplicatePhone : duplicateEmail

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
                <h2 className="text-lg font-semibold">Nueva Oportunidad</h2>
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
                  {/* Contact name */}
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

                  {/* Phone */}
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

                  {/* Email */}
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

                  {/* Duplicate warning */}
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

                  {/* Company name */}
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="company_name">Empresa</Label>
                    <Input
                      id="company_name"
                      placeholder="Empresa S.A.S."
                      {...register('company_name')}
                    />
                  </div>

                  {/* Estimated value */}
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="estimated_value">Valor estimado (COP)</Label>
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
                    duplicateWarning ||
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
