import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface BantDistributionData {
  low: number // 0-39
  medium: number // 40-69
  high: number // 70-100
  average: number
}

interface BantDistributionProps {
  data?: BantDistributionData
}

// Mock data for demo
const mockData: BantDistributionData = {
  low: 15,
  medium: 28,
  high: 12,
  average: 52,
}

const COLORS = {
  low: 'var(--score-low)',
  medium: 'var(--score-medium)',
  high: 'var(--score-high)',
}

export function BantDistribution({ data = mockData }: BantDistributionProps) {
  const chartData = [
    { name: 'Bajo (0-39)', value: data.low, color: COLORS.low },
    { name: 'Medio (40-69)', value: data.medium, color: COLORS.medium },
    { name: 'Alto (70-100)', value: data.high, color: COLORS.high },
  ]

  const total = data.low + data.medium + data.high

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Distribución BANT</CardTitle>
          <Badge variant="secondary" className="font-mono">
            Promedio: {data.average}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`${value} oportunidades`, '']}
              contentStyle={{
                backgroundColor: 'var(--popover)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value: string) => (
                <span className="text-xs text-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Score breakdown */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div className="flex flex-col items-center p-2 rounded-md bg-red-50 dark:bg-red-950/30">
            <span className="text-lg font-semibold text-red-600 dark:text-red-400 font-mono">
              {data.low}
            </span>
            <span className="text-xs text-muted-foreground">
              {total > 0 ? Math.round((data.low / total) * 100) : 0}%
            </span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-md bg-amber-50 dark:bg-amber-950/30">
            <span className="text-lg font-semibold text-amber-600 dark:text-amber-400 font-mono">
              {data.medium}
            </span>
            <span className="text-xs text-muted-foreground">
              {total > 0 ? Math.round((data.medium / total) * 100) : 0}%
            </span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-md bg-green-50 dark:bg-green-950/30">
            <span className="text-lg font-semibold text-green-600 dark:text-green-400 font-mono">
              {data.high}
            </span>
            <span className="text-xs text-muted-foreground">
              {total > 0 ? Math.round((data.high / total) * 100) : 0}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
