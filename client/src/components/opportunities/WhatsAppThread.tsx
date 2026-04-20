import { useState } from 'react'
import { Send, Phone, Video, MoreVertical, Check, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  content: string
  timestamp: string
  isOutgoing: boolean
  status: 'sent' | 'delivered' | 'read'
}

interface WhatsAppThreadProps {
  contactName: string
  contactPhone: string
  contactAvatar?: string
}

export function WhatsAppThread({ contactName, contactPhone, contactAvatar }: WhatsAppThreadProps) {
  const [message, setMessage] = useState('')
  const [messages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hola! Queria hacer seguimiento de nuestra propuesta',
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
      isOutgoing: true,
      status: 'read'
    },
    {
      id: '2',
      content: 'Hola! Si, estamos revisandola internamente',
      timestamp: new Date(Date.now() - 3600000 * 23).toISOString(),
      isOutgoing: false,
      status: 'read'
    },
    {
      id: '3',
      content: 'Perfecto, quedamos atentos. Cualquier duda nos comentas',
      timestamp: new Date(Date.now() - 3600000 * 22).toISOString(),
      isOutgoing: true,
      status: 'read'
    },
    {
      id: '4',
      content: 'Gracias! Les escribo esta semana con una respuesta',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      isOutgoing: false,
      status: 'read'
    },
  ])

  const handleSend = () => {
    if (!message.trim()) return
    // In real app, this would send the message
    setMessage('')
  }

  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />
    }
  }

  return (
    <div className="flex flex-col h-[400px] border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-emerald-600 text-white">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-white/20">
            <AvatarImage src={contactAvatar} />
            <AvatarFallback className="bg-emerald-700 text-white">
              {contactName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{contactName}</p>
            <p className="text-xs text-emerald-100">{contactPhone}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-emerald-700">
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-emerald-700">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-emerald-700">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 bg-[#e5ddd5]">
        <div className="space-y-2">
          {messages.map((msg, index) => {
            const showDate = index === 0 || 
              format(new Date(msg.timestamp), 'yyyy-MM-dd') !== 
              format(new Date(messages[index - 1].timestamp), 'yyyy-MM-dd')

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex justify-center my-4">
                    <span className="px-3 py-1 text-xs bg-white/80 rounded-full text-muted-foreground shadow-sm">
                      {format(new Date(msg.timestamp), 'dd MMMM yyyy', { locale: es })}
                    </span>
                  </div>
                )}
                <div className={cn(
                  "flex",
                  msg.isOutgoing ? "justify-end" : "justify-start"
                )}>
                  <div className={cn(
                    "max-w-[80%] px-3 py-2 rounded-lg shadow-sm",
                    msg.isOutgoing 
                      ? "bg-emerald-100 rounded-br-none" 
                      : "bg-white rounded-bl-none"
                  )}>
                    <p className="text-sm">{msg.content}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(msg.timestamp), 'HH:mm')}
                      </span>
                      {msg.isOutgoing && getStatusIcon(msg.status)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="flex items-center gap-2 p-3 bg-muted/50 border-t">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1"
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <Button 
          size="icon" 
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={handleSend}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
