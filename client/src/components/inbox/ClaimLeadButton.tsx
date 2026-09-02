import { useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { claimContact, whatsappInboxErrorMessage } from '@/lib/whatsappInboxApi'
import { queryKeys } from '@/lib/queryClient'

export function ClaimLeadButton({ contactId }: { contactId: string }) {
  const queryClient = useQueryClient()

  const claimMutation = useMutation({
    mutationFn: () => claimContact(contactId),
    onSuccess: () => {
      toast.success('Lead reclamado — ya es tuyo')
      void queryClient.invalidateQueries({ queryKey: queryKeys.whatsappConversations.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all })
    },
    onError: (err: unknown) => toast.error(whatsappInboxErrorMessage(err)),
  })

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 gap-1.5 text-xs"
      disabled={claimMutation.isPending}
      onClick={(e) => {
        e.stopPropagation()
        claimMutation.mutate()
      }}
    >
      {claimMutation.isPending ? <Spinner className="size-3.5" /> : <UserPlus className="size-3.5" />}
      Tomar lead
    </Button>
  )
}
