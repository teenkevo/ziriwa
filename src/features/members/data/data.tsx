import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle,
  Circle,
  CircleOff,
  HelpCircle,
  Timer,
} from 'lucide-react'

export const labels = [
  {
    value: 'bug',
    label: 'Pause Investments',
  },
  {
    value: 'feature',
    label: 'Halt Investments',
  },
  {
    value: 'documentation',
    label: 'Refund',
  },
]

export const statuses = [
  {
    value: 'in arrears',
    label: 'In Arrears',
    icon: Timer,
  },
  {
    value: 'fully paid',
    label: 'Fully Paid',
    icon: CheckCircle,
  },
]
