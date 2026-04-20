import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'

interface ConsultantData {
  id: string
  name: string
  avatar_url?: string
  won_count: number
  total_value: number
}

interface TopConsultantsProps {
  data?: ConsultantData[]
}

// Mock data for demo
const mockData: ConsultantData[] = [
  { id: '1', name: 'Juliana Rodríguez', won_count: 8, total_value: 45000000 },
  { id: '2', name: 'Carlos Méndez', won_count: 6, total_value: 38000000 },
  { id: '3', name: 'Ana Martínez', won_count: 5, total_value: 32000000 },
  { id: '4', name: 'Miguel Torres', won_count: 4, total_value: 28000000 },
  { id: '5', name: 'Laura Gómez', won_count: 3, total_value: 22000000 },
]

export function TopConsultants({ data = mockData }: TopConsultantsProps) {
  const maxValue = Math.max(...data.map((d) => d.won_count))

  const chartData = data.map((item) => ({
    ...item,
    percentage: (item.won_count / maxValue) * 100,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          Top 5 Consultores del Mes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {chartData.map((consultant, index) => (
            <div key={consultant.id} className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground w-4 tabular-nums">
                {index + 1}
              </span>
              <Avatar className="size-8">
                <AvatarImage src={consultant.avatar_url} alt={consultant.name} />
                <AvatarFallback className="text-xs">
                  {getInitials(consultant.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{consultant.name}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${consultant.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                    {consultant.won_count}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {data.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <p className="text-sm text-muted-foreground">
                No hay datos de consultores
              </p>
            </div>
          )}
        </div>

        {/* Alternative bar chart view */}
        {data.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip
                  formatter={(value: number) => [`${value} ganadas`, 'Oportunidades']}
                  contentStyle={{
                    backgroundColor: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="won_count" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? 'var(--primary)' : 'var(--muted)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
