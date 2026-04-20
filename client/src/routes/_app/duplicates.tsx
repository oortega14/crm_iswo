import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Search,
  Merge,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  User,
  Building2,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/duplicates')({
  component: DuplicatesPage,
})

interface DuplicateGroup {
  id: string
  type: 'contact' | 'company'
  matchScore: number
  reason: string
  items: {
    id: string
    name: string
    email?: string
    phone?: string
    company?: string
    createdAt: string
    opportunitiesCount: number
  }[]
}

function DuplicatesPage() {
  const queryClient = useQueryClient()
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false)

  const { data: duplicates, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['duplicates'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const mockDuplicates: DuplicateGroup[] = [
        {
          id: 'dup-1',
          type: 'contact',
          matchScore: 95,
          reason: 'Email similar',
          items: [
            { id: 'c1', name: 'Juan Garcia', email: 'juan.garcia@techcorp.com', phone: '+34 600 123 456', company: 'TechCorp', createdAt: new Date(Date.now() - 30 * 86400000).toISOString(), opportunitiesCount: 2 },
            { id: 'c2', name: 'Juan Garcia Lopez', email: 'jgarcia@techcorp.com', phone: '+34 600 123 456', company: 'TechCorp', createdAt: new Date(Date.now() - 15 * 86400000).toISOString(), opportunitiesCount: 0 },
          ]
        },
        {
          id: 'dup-2',
          type: 'contact',
          matchScore: 88,
          reason: 'Telefono identico',
          items: [
            { id: 'c3', name: 'Maria Lopez', email: 'maria@innosoft.com', phone: '+34 611 222 333', company: 'InnoSoft', createdAt: new Date(Date.now() - 60 * 86400000).toISOString(), opportunitiesCount: 1 },
            { id: 'c4', name: 'Maria L.', email: 'mlopez@empresa.com', phone: '+34 611 222 333', company: 'InnoSoft', createdAt: new Date(Date.now() - 10 * 86400000).toISOString(), opportunitiesCount: 0 },
          ]
        },
        {
          id: 'dup-3',
          type: 'company',
          matchScore: 92,
          reason: 'Nombre similar',
          items: [
            { id: 'co1', name: 'TechCorp Solutions', email: 'info@techcorp.com', createdAt: new Date(Date.now() - 90 * 86400000).toISOString(), opportunitiesCount: 5 },
            { id: 'co2', name: 'Tech Corp', email: 'contact@techcorp.es', createdAt: new Date(Date.now() - 20 * 86400000).toISOString(), opportunitiesCount: 1 },
          ]
        },
        {
          id: 'dup-4',
          type: 'contact',
          matchScore: 78,
          reason: 'Nombre y empresa coinciden',
          items: [
            { id: 'c5', name: 'Pedro Martinez', email: 'pedro@cloudnet.com', phone: '+34 622 333 444', company: 'CloudNet', createdAt: new Date(Date.now() - 45 * 86400000).toISOString(), opportunitiesCount: 3 },
            { id: 'c6', name: 'Pedro Martinez R.', email: 'pmartinez@cloudnet.es', phone: '+34 622 444 555', company: 'CloudNet', createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), opportunitiesCount: 0 },
          ]
        },
      ]
      
      return mockDuplicates
    }
  })

  const mergeMutation = useMutation({
    mutationFn: async ({ groupId, keepId, deleteIds }: { groupId: string; keepId: string; deleteIds: string[] }) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { groupId, keepId, deleteIds }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duplicates'] })
      toast.success('Registros fusionados exitosamente')
      setIsMergeDialogOpen(false)
      setSelectedGroup(null)
      setSelectedItems([])
    },
    onError: () => {
      toast.error('Error al fusionar los registros')
    }
  })

  const dismissMutation = useMutation({
    mutationFn: async (groupId: string) => {
      await new Promise(resolve => setTimeout(resolve, 500))
      return groupId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duplicates'] })
      toast.success('Duplicado descartado')
    }
  })

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return 'text-red-500'
    if (score >= 80) return 'text-amber-500'
    return 'text-green-500'
  }

  const contactDuplicates = duplicates?.filter(d => d.type === 'contact') ?? []
  const companyDuplicates = duplicates?.filter(d => d.type === 'company') ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Duplicados</h1>
          <p className="text-sm text-muted-foreground">
            Detecta y fusiona registros duplicados
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          {isRefetching ? (
            <Spinner className="mr-2" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Analizar Duplicados
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{duplicates?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Grupos duplicados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <User className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{contactDuplicates.length}</p>
                <p className="text-xs text-muted-foreground">Contactos duplicados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <Building2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{companyDuplicates.length}</p>
                <p className="text-xs text-muted-foreground">Empresas duplicadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Duplicates List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : duplicates?.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
              <h3 className="mt-4 text-lg font-medium">Sin duplicados</h3>
              <p className="text-sm text-muted-foreground mt-1">
                No se encontraron registros duplicados en tu base de datos
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {duplicates?.map((group) => (
            <Card key={group.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      group.type === 'contact' ? 'bg-blue-100' : 'bg-green-100'
                    )}>
                      {group.type === 'contact' ? (
                        <User className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Building2 className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {group.items.length} {group.type === 'contact' ? 'contactos' : 'empresas'} similares
                      </CardTitle>
                      <CardDescription>{group.reason}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={getMatchScoreColor(group.matchScore)}>
                      {group.matchScore}% coincidencia
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => dismissMutation.mutate(group.id)}
                    >
                      Descartar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedGroup(group)
                        setSelectedItems([group.items[0].id])
                        setIsMergeDialogOpen(true)
                      }}
                    >
                      <Merge className="mr-2 h-4 w-4" />
                      Fusionar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.items.map((item) => (
                    <div 
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={`https://avatar.vercel.sh/${item.email}`} />
                        <AvatarFallback>
                          {item.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        {item.email && (
                          <p className="text-sm text-muted-foreground truncate">{item.email}</p>
                        )}
                        {item.phone && (
                          <p className="text-sm text-muted-foreground">{item.phone}</p>
                        )}
                        {item.company && (
                          <p className="text-sm text-muted-foreground">{item.company}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {item.opportunitiesCount} oportunidades
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Merge Dialog */}
      <Dialog open={isMergeDialogOpen} onOpenChange={setIsMergeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Fusionar Registros</DialogTitle>
            <DialogDescription>
              Selecciona el registro principal que quieres mantener. Los demas seran eliminados y sus datos se fusionaran.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {selectedGroup?.items.map((item) => (
              <div 
                key={item.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  selectedItems.includes(item.id) 
                    ? "border-primary bg-primary/5" 
                    : "hover:bg-muted/50"
                )}
                onClick={() => setSelectedItems([item.id])}
              >
                <Checkbox 
                  checked={selectedItems.includes(item.id)}
                  onCheckedChange={() => setSelectedItems([item.id])}
                />
                <Avatar className="h-10 w-10">
                  <AvatarImage src={`https://avatar.vercel.sh/${item.email}`} />
                  <AvatarFallback>
                    {item.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  {item.email && <p className="text-sm text-muted-foreground">{item.email}</p>}
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {item.opportunitiesCount} oportunidades vinculadas
                  </Badge>
                </div>
                {selectedItems.includes(item.id) && (
                  <Badge className="bg-primary">Principal</Badge>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMergeDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (selectedGroup && selectedItems.length > 0) {
                  const keepId = selectedItems[0]
                  const deleteIds = selectedGroup.items
                    .filter(i => i.id !== keepId)
                    .map(i => i.id)
                  
                  mergeMutation.mutate({
                    groupId: selectedGroup.id,
                    keepId,
                    deleteIds
                  })
                }
              }}
              disabled={selectedItems.length === 0 || mergeMutation.isPending}
            >
              {mergeMutation.isPending && <Spinner className="mr-2" />}
              Fusionar Registros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
