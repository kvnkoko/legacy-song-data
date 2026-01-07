'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useDebounce } from '@/hooks/use-debounce'
import { EMPLOYEE_STATUS_LABELS, type EmployeeStatusType } from '@/lib/constants'

interface EmployeeFiltersProps {
  departments: string[]
  teams: string[]
  roles: string[]
  statuses: (EmployeeStatusType | string)[]
}

export function EmployeeFilters({ departments, teams, roles, statuses }: EmployeeFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [department, setDepartment] = useState(searchParams.get('department') || 'all')
  const [team, setTeam] = useState(searchParams.get('team') || 'all')
  const [role, setRole] = useState(searchParams.get('role') || 'all')
  const [status, setStatus] = useState(searchParams.get('status') || 'active')
  
  // Debounce search input
  const debouncedSearch = useDebounce(search, 300)
  
  // Ensure Select components have valid values (not empty strings)
  const departmentValue = department || 'all'
  const teamValue = team || 'all'
  const roleValue = role || 'all'

  // Auto-apply search when debounced value changes
  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (department && department !== 'all') params.set('department', department)
    if (team && team !== 'all') params.set('team', team)
    if (role && role !== 'all') params.set('role', role)
    // Explicitly set status parameter - 'all' to show all statuses, 'active' for default, or specific status
    if (status === 'all') {
      params.set('status', 'all')
    } else if (status && status !== 'active') {
      params.set('status', status)
    }
    router.push(`/employees?${params.toString()}`)
  }, [debouncedSearch, department, team, role, status, router])

  const handleFilter = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (department && department !== 'all') params.set('department', department)
    if (team && team !== 'all') params.set('team', team)
    if (role && role !== 'all') params.set('role', role)
    // Explicitly set status parameter - 'all' to show all statuses, 'active' for default, or specific status
    if (status === 'all') {
      params.set('status', 'all')
    } else if (status && status !== 'active') {
      params.set('status', status)
    }
    router.push(`/employees?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearch('')
    setDepartment('all')
    setTeam('all')
    setRole('all')
    setStatus('active')
    router.push('/employees')
  }

  const hasActiveFilters = search || (department && department !== 'all') || (team && team !== 'all') || (role && role !== 'all') || (status && status !== 'all' && status !== 'active')

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex-1 min-w-[200px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="Search employees, job titles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      <div className="w-[180px]">
        <Select value={departmentValue} onValueChange={setDepartment}>
          <SelectTrigger>
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-[150px]">
        <Select value={teamValue} onValueChange={setTeam}>
          <SelectTrigger>
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-[150px]">
        <Select value={roleValue} onValueChange={setRole}>
          <SelectTrigger>
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r} value={r}>
                {r.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-[150px]">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {EMPLOYEE_STATUS_LABELS[s as EmployeeStatusType] || s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="button" onClick={handleFilter} variant="outline">
        Apply Filters
      </Button>
      {hasActiveFilters && (
        <Button type="button" variant="ghost" onClick={clearFilters}>
          <X className="w-4 h-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  )
}

