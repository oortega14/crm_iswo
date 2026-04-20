import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Check,
  ExternalLink,
  Settings,
  Zap,
  Mail,
  Calendar,
  MessageSquare,
  Database,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/settings/integrations')({
  component: IntegrationsSettingsPage,
})

interface Integration {
  id: string
  name: string
  description: string
  icon: typeof Mail
  category: 'email' | 'calendar' | 'communication' | 'storage' | 'automation'
  connected: boolean
  config?: Record<string, string>
}

function IntegrationsSettingsPage() {
  const queryClient = useQueryClient()
  const [configDialog, setConfigDialog] = useState<Integration | null>(null)
  const [apiKey, setApiKey] = useState('')

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const mockIntegrations: Integration[] = [
        {
          id: 'gmail',
          name: 'Gmail',
          description: 'Sincroniza emails y registra comunicaciones automaticamente',
          icon: Mail,
          category: 'email',
          connected: true,
          config: { email: 'team@company.com' }
        },
        {
          id: 'outlook',
          name: 'Outlook',
          description: 'Conecta tu cuenta de Outlook para sincronizar emails',
          icon: Mail,
          category: 'email',
          connected: false
        },
        {
          id: 'google-calendar',
          name: 'Google Calendar',
          description: 'Sincroniza reuniones y eventos con tu calendario',
          icon: Calendar,
          category: 'calendar',
          connected: true,
          config: { calendar: 'primary' }
        },
        {
          id: 'slack',
          name: 'Slack',
          description: 'Recibe notificaciones en Slack sobre actividad importante',
          icon: MessageSquare,
          category: 'communication',
          connected: false
        },
        {
          id: 'teams',
          name: 'Microsoft Teams',
          description: 'Integracion con Teams para notificaciones y reuniones',
          icon: MessageSquare,
          category: 'communication',
          connected: false
        },
        {
          id: 'hubspot',
          name: 'HubSpot',
          description: 'Sincroniza contactos y oportunidades con HubSpot',
          icon: Database,
          category: 'automation',
          connected: false
        },
        {
          id: 'salesforce',
          name: 'Salesforce',
          description: 'Importa y exporta datos desde Salesforce',
          icon: Database,
          category: 'automation',
          connected: false
        },
        {
          id: 'zapier',
          name: 'Zapier',
          description: 'Conecta con miles de aplicaciones mediante Zapier',
          icon: Zap,
          category: 'automation',
          connected: true,
          config: { webhooks: '3 activos' }
        },
        {
          id: 'google-drive',
          name: 'Google Drive',
          description: 'Almacena y vincula documentos desde Google Drive',
          icon: FileText,
          category: 'storage',
          connected: false
        },
        {
          id: 'dropbox',
          name: 'Dropbox',
          description: 'Conecta Dropbox para gestionar archivos',
          icon: FileText,
          category: 'storage',
          connected: false
        },
      ]
      
      return mockIntegrations
    }
  })

  const toggleIntegrationMutation = useMutation({
    mutationFn: async ({ id, connect }: { id: string; connect: boolean }) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { id, connected: connect }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      toast.success(
        data.connected 
          ? 'Integracion conectada exitosamente' 
          : 'Integracion desconectada'
      )
      setConfigDialog(null)
      setApiKey('')
    },
    onError: () => {
      toast.error('Error al actualizar la integracion')
    }
  })

  const categories = [
    { id: 'email', name: 'Email', icon: Mail },
    { id: 'calendar', name: 'Calendario', icon: Calendar },
    { id: 'communication', name: 'Comunicacion', icon: MessageSquare },
    { id: 'storage', name: 'Almacenamiento', icon: FileText },
    { id: 'automation', name: 'Automatizacion', icon: Zap },
  ]

  const connectedCount = integrations?.filter(i => i.connected).length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Integraciones</h2>
          <p className="text-sm text-muted-foreground">
            Conecta servicios externos para mejorar tu flujo de trabajo
          </p>
        </div>
        <Badge variant="secondary">
          {connectedCount} conectadas
        </Badge>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map((category) => {
            const categoryIntegrations = integrations?.filter(
              i => i.category === category.id
            )
            if (!categoryIntegrations?.length) return null

            return (
              <div key={category.id}>
                <div className="flex items-center gap-2 mb-4">
                  <category.icon className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-medium">{category.name}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categoryIntegrations.map((integration) => (
                    <Card 
                      key={integration.id}
                      className={cn(
                        "transition-colors",
                        integration.connected && "border-primary/50"
                      )}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-lg",
                              integration.connected 
                                ? "bg-primary/10" 
                                : "bg-muted"
                            )}>
                              <integration.icon className={cn(
                                "h-5 w-5",
                                integration.connected 
                                  ? "text-primary" 
                                  : "text-muted-foreground"
                              )} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{integration.name}</h4>
                                {integration.connected && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Check className="mr-1 h-3 w-3" />
                                    Conectado
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {integration.description}
                              </p>
                              {integration.config && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  {Object.entries(integration.config).map(([key, value]) => (
                                    <span key={key}>{value}</span>
                                  ))}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {integration.connected && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setConfigDialog(integration)}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            )}
                            <Switch
                              checked={integration.connected}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setConfigDialog(integration)
                                } else {
                                  toggleIntegrationMutation.mutate({
                                    id: integration.id,
                                    connect: false
                                  })
                                }
                              }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* API Key / Config Dialog */}
      <Dialog open={!!configDialog} onOpenChange={(open) => !open && setConfigDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {configDialog?.connected ? 'Configurar' : 'Conectar'} {configDialog?.name}
            </DialogTitle>
            <DialogDescription>
              {configDialog?.connected
                ? 'Actualiza la configuracion de esta integracion'
                : 'Ingresa las credenciales para conectar esta integracion'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {configDialog?.id === 'zapier' ? (
              <div className="space-y-2">
                <Label htmlFor="webhook">Webhook URL</Label>
                <Input
                  id="webhook"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="https://hooks.zapier.com/..."
                />
                <p className="text-xs text-muted-foreground">
                  Encuentra tu webhook URL en tu Zap de Zapier
                </p>
              </div>
            ) : configDialog?.id.includes('google') || configDialog?.id === 'gmail' ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Seras redirigido a Google para autorizar el acceso
                </p>
                <Button variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Conectar con Google
                </Button>
              </div>
            ) : configDialog?.id === 'slack' || configDialog?.id === 'teams' ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Seras redirigido para autorizar el acceso
                </p>
                <Button variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Conectar con {configDialog?.name}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                />
                <p className="text-xs text-muted-foreground">
                  Encuentra tu API Key en la configuracion de {configDialog?.name}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialog(null)}>
              Cancelar
            </Button>
            {configDialog?.connected ? (
              <Button 
                variant="destructive"
                onClick={() => {
                  if (configDialog) {
                    toggleIntegrationMutation.mutate({
                      id: configDialog.id,
                      connect: false
                    })
                  }
                }}
                disabled={toggleIntegrationMutation.isPending}
              >
                {toggleIntegrationMutation.isPending && <Spinner className="mr-2" />}
                Desconectar
              </Button>
            ) : (
              <Button 
                onClick={() => {
                  if (configDialog) {
                    toggleIntegrationMutation.mutate({
                      id: configDialog.id,
                      connect: true
                    })
                  }
                }}
                disabled={toggleIntegrationMutation.isPending}
              >
                {toggleIntegrationMutation.isPending && <Spinner className="mr-2" />}
                Conectar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
