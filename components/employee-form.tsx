'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserRole, EmployeeStatus } from '@prisma/client'
import { EMPLOYEE_STATUS } from '@/lib/constants'
import { useToast } from '@/hooks/use-toast'
import { Building2 } from 'lucide-react'

const ROLES = [
  { value: 'none', label: 'No CMS Access (Employee Only)' },
  { value: UserRole.ADMIN, label: 'Admin' },
  { value: UserRole.MANAGER, label: 'Manager' },
  { value: UserRole.A_R, label: 'A&R' },
  { value: UserRole.DATA_TEAM, label: 'Data Team' },
  { value: UserRole.PLATFORM_YOUTUBE, label: 'Platform - YouTube' },
  { value: UserRole.PLATFORM_FLOW, label: 'Platform - Flow' },
  { value: UserRole.PLATFORM_RINGTUNES, label: 'Platform - Ringtunes' },
  { value: UserRole.PLATFORM_INTERNATIONAL_STREAMING, label: 'Platform - International Streaming' },
  { value: UserRole.PLATFORM_FACEBOOK, label: 'Platform - Facebook' },
  { value: UserRole.PLATFORM_TIKTOK, label: 'Platform - TikTok' },
]

interface Employee {
  id: string
  user: {
    name: string | null
    email: string
  }
}

interface EmployeeFormProps {
  onSuccess?: () => void
}

export function EmployeeForm({ onSuccess }: EmployeeFormProps = {}) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<Array<{ name: string; employeeCount: number }>>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'none',
    employeeId: '',
    team: '',
    department: '',
    jobTitle: '',
    location: '',
    hireDate: '',
    bio: '',
    reportingToId: 'none',
    status: EMPLOYEE_STATUS.ACTIVE,
  })

  useEffect(() => {
    // Fetch departments
    fetch('/api/departments')
      .then(res => res.json())
      .then(data => {
        if (data.departments) {
          setDepartments(data.departments)
        }
      })
      .catch(err => console.error('Failed to fetch departments:', err))

    // Fetch employees for reportingTo dropdown
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => {
        if (data.employees) {
          setEmployees(data.employees.filter((e: Employee) => e.id)) // Filter out any invalid entries
        }
      })
      .catch(err => console.error('Failed to fetch employees:', err))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          role: formData.role === 'none' ? UserRole.CLIENT : formData.role, // Default to CLIENT if no role selected
          department: formData.department === 'none' ? '' : formData.department,
          reportingToId: formData.reportingToId === 'none' ? null : formData.reportingToId,
          status: formData.status,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create employee')
      }

      toast({
        title: 'Success',
        description: 'Employee created successfully',
      })

      // Reset form
      setFormData({
          email: '',
          name: '',
          password: '',
          role: 'none',
          employeeId: '',
          team: '',
          department: '',
          jobTitle: '',
          location: '',
          hireDate: '',
          bio: '',
          reportingToId: 'none',
          status: EMPLOYEE_STATUS.ACTIVE,
        })

      router.refresh()
      onSuccess?.()
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to create employee',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password *</Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          minLength={6}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">CMS Role (Optional)</Label>
        <Select
          value={formData.role}
          onValueChange={(value) => setFormData({ ...formData, role: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select role (or 'No CMS Access' for employee only)" />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Employees without CMS roles won't have dashboard access
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="employeeId">Employee ID</Label>
        <Input
          id="employeeId"
          value={formData.employeeId}
          onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
          placeholder="Auto-generated if empty"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="team">Team</Label>
        <Input
          id="team"
          value={formData.team}
          onChange={(e) => setFormData({ ...formData, team: e.target.value })}
          placeholder="e.g., A&R, Production, Marketing"
        />
      </div>

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
            placeholder="Or type new department"
            className="flex-1"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Select from existing departments or type a new department name
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="jobTitle">Job Title</Label>
        <Input
          id="jobTitle"
          value={formData.jobTitle}
          onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
          placeholder="e.g., A&R Manager, Producer, Marketing Director"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="e.g., New York, Los Angeles, Remote"
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
        <Label htmlFor="reportingToId">Reports To (Manager)</Label>
        <Select
          value={formData.reportingToId}
          onValueChange={(value) => setFormData({ ...formData, reportingToId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select manager" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Manager (Top Level)</SelectItem>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.user.name || emp.user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Set the organizational hierarchy - who this employee reports to
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Employee bio or description"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Employment Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value as EmployeeStatus })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={EMPLOYEE_STATUS.ACTIVE}>Active</SelectItem>
            <SelectItem value={EMPLOYEE_STATUS.ON_LEAVE}>On Leave</SelectItem>
            <SelectItem value={EMPLOYEE_STATUS.PROBATION}>Probation</SelectItem>
            <SelectItem value={EMPLOYEE_STATUS.SUSPENDED}>Suspended</SelectItem>
            <SelectItem value={EMPLOYEE_STATUS.RESIGNED}>Resigned</SelectItem>
            <SelectItem value={EMPLOYEE_STATUS.TERMINATED}>Terminated</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Default status for new employees is Active
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating...' : 'Create Employee'}
      </Button>
    </form>
  )
}

