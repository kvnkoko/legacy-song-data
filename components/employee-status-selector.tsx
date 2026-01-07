'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { EmployeeStatus } from '@prisma/client'
import { EMPLOYEE_STATUS, type EmployeeStatusType } from '@/lib/constants'
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  UserX,
  Ban,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<EmployeeStatusType, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  [EMPLOYEE_STATUS.ACTIVE]: {
    label: 'Active',
    color: 'bg-flow-green/10 text-flow-green border-flow-green/20',
    icon: CheckCircle2,
  },
  [EMPLOYEE_STATUS.ON_LEAVE]: {
    label: 'On Leave',
    color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    icon: Clock,
  },
  [EMPLOYEE_STATUS.PROBATION]: {
    label: 'Probation',
    color: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    icon: AlertCircle,
  },
  [EMPLOYEE_STATUS.SUSPENDED]: {
    label: 'Suspended',
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
    icon: Ban,
  },
  [EMPLOYEE_STATUS.RESIGNED]: {
    label: 'Resigned',
    color: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
    icon: UserX,
  },
  [EMPLOYEE_STATUS.TERMINATED]: {
    label: 'Terminated',
    color: 'bg-red-600/10 text-red-700 border-red-600/20',
    icon: XCircle,
  },
}

interface EmployeeStatusSelectorProps {
  employeeId: string
  currentStatus: EmployeeStatus
  employeeName: string
  onStatusChange?: () => void
  className?: string
}

export function EmployeeStatusSelector({
  employeeId,
  currentStatus,
  employeeName,
  onStatusChange,
  className,
}: EmployeeStatusSelectorProps) {
  const router = useRouter()
  const [selectedStatus, setSelectedStatus] = useState<EmployeeStatus>(currentStatus)
  const [showDialog, setShowDialog] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const currentConfig = STATUS_CONFIG[currentStatus]
  const CurrentIcon = currentConfig.icon

  const requiresConfirmation = (status: EmployeeStatusType) => {
    return status === EMPLOYEE_STATUS.TERMINATED || 
           status === EMPLOYEE_STATUS.RESIGNED ||
           (currentStatus === EMPLOYEE_STATUS.TERMINATED && status !== EMPLOYEE_STATUS.TERMINATED)
  }

  const handleStatusChange = (newStatus: EmployeeStatusType) => {
    setSelectedStatus(newStatus)
    if (requiresConfirmation(newStatus)) {
      setShowDialog(true)
    } else {
      updateStatus(newStatus, '')
    }
  }

  const updateStatus = async (status: EmployeeStatusType, changeNotes: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/employees/${employeeId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes: changeNotes }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update employee status')
      }

      toast({
        title: 'Status Updated',
        description: `Employee status changed to ${STATUS_CONFIG[status].label}`,
      })

      setShowDialog(false)
      setNotes('')
      if (onStatusChange) {
        onStatusChange()
      } else {
        // Default behavior: refresh the page to show updated status
        router.refresh()
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update employee status',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    updateStatus(selectedStatus, notes)
  }

  return (
    <>
      <div className={cn('flex items-center gap-2', className)}>
        <Badge
          variant="outline"
          className={cn(
            'flex items-center gap-1.5 px-3 py-1',
            currentConfig.color
          )}
        >
          <CurrentIcon className="w-3.5 h-3.5" />
          {currentConfig.label}
        </Badge>
        <Select
          value={currentStatus}
          onValueChange={(value) => handleStatusChange(value as EmployeeStatus)}
          disabled={loading}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_CONFIG).map(([status, config]) => {
              const Icon = config.icon
              return (
                <SelectItem key={status} value={status as string}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              You are about to change {employeeName}&apos;s status from{' '}
              <strong>{STATUS_CONFIG[currentStatus].label}</strong> to{' '}
              <strong>{STATUS_CONFIG[selectedStatus].label}</strong>.
              {requiresConfirmation(selectedStatus) && (
                <span className="block mt-2 text-destructive font-medium">
                  This action requires confirmation.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Reason / Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this status change..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false)
                setNotes('')
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              variant={selectedStatus === EMPLOYEE_STATUS.TERMINATED || selectedStatus === EMPLOYEE_STATUS.RESIGNED ? 'destructive' : 'default'}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Confirm Change'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function EmployeeStatusBadge({ status }: { status: EmployeeStatusType | EmployeeStatus | string }) {
  // Convert Prisma enum to string if needed
  const statusStr = typeof status === 'string' ? status : status.toString()
  const config = STATUS_CONFIG[statusStr as EmployeeStatusType]
  if (!config) {
    // Fallback for unknown status
    return (
      <Badge variant="outline" className="flex items-center gap-1.5 px-2 py-0.5">
        {statusStr}
      </Badge>
    )
  }
  const Icon = config.icon

  return (
    <Badge
      variant="outline"
      className={cn('flex items-center gap-1.5 px-2 py-0.5', config.color)}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  )
}

