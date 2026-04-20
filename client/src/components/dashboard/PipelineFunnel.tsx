import { useNavigate } from '@tanstack/react-router'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatStatusLabel } from '@/lib/utils'

interface PipelineStageData {
  stage: string
  stage_id: string
  count: number
  value: number
  conversion_rate: number
}

interface PipelineFunnelProps {
  data?: PipelineStageData[]
}

const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

// Mock data for demo
const mockData: PipelineStageData[] = [
  { stage: 'new_lead', stage_id: '1', count: 45, value: 150000000, conversion_rate: 100 },
  { stage: 'contacted', stage_id: '2', count: 32, value: 120000000, conversion_rate: 71 },
  { stage: 'qualified', stage_id: '3', count: 18, value: 85000000, conversion_rate: 56 },
  { stage: 'proposal', stage_id: '4', count: 8, value: 45000000, conversion_rate: 44 },
  { stage: 'won', stage_id: '5', count: 5, value: 28000000, conversion_rate: 63 },
]

export function PipelineFunnel({ data = mockData }: PipelineFunnelProps) {
  const navigate = useNavigate()

  const chartData = data.map((item, index) => ({
    ...item,
    name: formatStatusLabel(item.stage),
    fill: COLORS[index % COLORS.length],
  }))

  const handleBarClick = (stageId: string) => {
    navigate({ to: '/opportunities', search: { stage: stageId } })
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Pipeline de Oportunidades</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              width={90}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'count') return [value, 'Oportunidades']
                return [value, name]
              }}
              contentStyle={{
                backgroundColor: 'var(--popover)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar
              dataKey="count"
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              onClick={(data) => handleBarClick(data.stage_id)}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="count"
                position="right"
                style={{ fontSize: '12px', fill: 'var(--foreground)' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Conversion rates */}
        <div className="mt-4 flex items-center justify-center gap-1 text-xs text-muted-foreground">
          {chartData.slice(0, -1).map((item, index) => (
            <div key={item.stage} className="flex items-center gap-1">
              <span className="font-mono">{item.conversion_rate}%</span>
              {index < chartData.length - 2 && (
                <span className="text-muted-foreground/50 mx-1">→</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
