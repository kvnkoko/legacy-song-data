'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Pencil, Building2 } from 'lucide-react'

interface EmployeeOrgEditProps {
  employeeId: string
  currentData: {
    department?: string | null
    jobTitle?: string | null
    location?: string | null
    team?: string | null
    hireDate?: Date | string | null
    reportingToId?: string | null
  }
  employees: Array<{
    id: string
    user: {
      name: string | null
      email: string
    }
  }>
  canEdit: boolean
}

export function EmployeeOrgEdit({
  employeeId,
  currentData,
  employees,
  canEdit,
}: EmployeeOrgEditProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<Array<{ name: string; employeeCount: number }>>([])
  const [formData, setFormData] = useState({
    department: currentData.department || '',
    jobTitle: currentData.jobTitle || '',
    location: currentData.location || '',
    team: currentData.team || '',
    hireDate: currentData.hireDate
      ? new Date(currentData.hireDate).toISOString().split('T')[0]
      : '',
    reportingToId: currentData.reportingToId || 'none',
  })

  useEffect(() => {
    // Fetch departments when dialog opens
    if (open) {
      fetch('/api/departments')
        .then(res => res.json())
        .then(data => {
          if (data.departments) {
            setDepartments(data.departments)
          }
        })
        .catch(err => console.error('Failed to fetch departments:', err))
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/employees/${employeeId}/org`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          department: formData.department === 'none' ? '' : formData.department,
          reportingToId: formData.reportingToId === 'none' ? null : formData.reportingToId,
          hireDate: formData.hireDate || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update employee')
      }

      toast({
        title: 'Success',
        description: 'Employee organizational information updated',
      })

      setOpen(false)
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update employee',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!canEdit) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="w-4 h-4 mr-2" />
          Edit Org Info
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Organizational Information</DialogTitle>
          <DialogDescription>
            Update department, job title, location, team, and reporting structure
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.department && departments.some(d => d.name === formData.department) ? formData.department : 'none'}
                  onValueChange={(value) => {
                    if (value === 'none') {
                      setFormData({ ...formData, department: '' })
                    } else {
                      setFormData({ ...formData, department: value })
                    }
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select existing department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Department</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.name} value={dept.name}>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          <span>{dept.name}</span>
                          <span className="text-xs text-muted-foreground">({dept.employeeCount})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => {
                    const newValue = e.target.value
                    setFormData({ ...formData, department: newValue })
                  }}
                  onKeyDown={(e) => {
                    // Allow typing freely - don't let Select interfere
                    e.stopPropagation()
                  }}
                  placeholder="Or type new"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                placeholder="e.g., A&R Manager"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., New York, Remote"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="team">Team</Label>
              <Input
                id="team"
                value={formData.team}
                onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                placeholder="e.g., A&R, Production"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hireDate">Hire Date</Label>
              <Input
                id="hireDate"
                type="date"
                value={formData.hireDate}
                onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reportingToId">Reports To</Label>
              <Select
                value={formData.reportingToId}
                onValueChange={(value) => setFormData({ ...formData, reportingToId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Manager (Top Level)</SelectItem>
                  {employees
                    .filter(e => e.id !== employeeId)
                    .map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.user.name || emp.user.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

