'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { 
  Building2, 
  Plus, 
  Pencil, 
  Trash2, 
  Users,
  X
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

interface Department {
  name: string
  employeeCount: number
}

interface Employee {
  id: string
  user: {
    name: string | null
    email: string
  }
  department: string | null
}

interface DepartmentManagerProps {
  employees: Employee[]
  canEdit: boolean
}

export function DepartmentManager({ employees, canEdit }: DepartmentManagerProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [selectedDept, setSelectedDept] = useState<string | null>(null)
  const [deptName, setDeptName] = useState('')
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set())
  const [targetDepartment, setTargetDepartment] = useState<string>('')

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments')
      const data = await response.json()
      if (data.departments) {
        setDepartments(data.departments)
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!deptName.trim()) {
      toast({
        title: 'Error',
        description: 'Department name is required',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: deptName.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create department')
      }

      toast({
        title: 'Success',
        description: 'Department created successfully',
      })

      setDeptName('')
      setCreateOpen(false)
      fetchDepartments()
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create department',
        variant: 'destructive',
      })
    }
  }

  const handleEdit = async () => {
    if (!selectedDept || !deptName.trim()) {
      toast({
        title: 'Error',
        description: 'Department name is required',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: deptName.trim(),
          oldName: selectedDept 
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update department')
      }

      toast({
        title: 'Success',
        description: 'Department updated successfully',
      })

      setDeptName('')
      setSelectedDept(null)
      setEditOpen(false)
      fetchDepartments()
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update department',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (!selectedDept) return

    try {
      const response = await fetch(`/api/departments?name=${encodeURIComponent(selectedDept)}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete department')
      }

      toast({
        title: 'Success',
        description: 'Department deleted successfully',
      })

      setSelectedDept(null)
      setDeleteOpen(false)
      fetchDepartments()
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete department',
        variant: 'destructive',
      })
    }
  }

  const handleAssign = async () => {
    if (selectedEmployees.size === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one employee',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch('/api/departments/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeIds: Array.from(selectedEmployees),
          department: targetDepartment === 'none' ? null : (targetDepartment || null),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign employees')
      }

      toast({
        title: 'Success',
        description: `Assigned ${data.updated} employee(s) to department`,
      })

      setSelectedEmployees(new Set())
      setTargetDepartment('')
      setAssignOpen(false)
      fetchDepartments()
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign employees',
        variant: 'destructive',
      })
    }
  }

  const toggleEmployee = (id: string) => {
    const newSelected = new Set(selectedEmployees)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedEmployees(newSelected)
  }

  const toggleAll = () => {
    if (selectedEmployees.size === employees.length) {
      setSelectedEmployees(new Set())
    } else {
      setSelectedEmployees(new Set(employees.map(e => e.id)))
    }
  }

  if (!canEdit) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Departments
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Manage departments and assign employees
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create Department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Department</DialogTitle>
                <DialogDescription>
                  Create a new department for organizing employees
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="deptName">Department Name</Label>
                  <Input
                    id="deptName"
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    placeholder="e.g., Music Production, Operations"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Users className="w-4 h-4 mr-2" />
                Assign Employees
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Assign Employees to Department</DialogTitle>
                <DialogDescription>
                  Select employees and assign them to a department
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Target Department</Label>
                  <Select value={targetDepartment} onValueChange={setTargetDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Department (Unassign)</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept.name} value={dept.name}>
                          {dept.name} ({dept.employeeCount} employees)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-lg p-4 max-h-[400px] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <Label>Select Employees ({selectedEmployees.size} selected)</Label>
                    <Button variant="ghost" size="sm" onClick={toggleAll}>
                      {selectedEmployees.size === employees.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {employees.map(emp => (
                      <div
                        key={emp.id}
                        className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={selectedEmployees.has(emp.id)}
                          onCheckedChange={() => toggleEmployee(emp.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {emp.user.name || emp.user.email}
                          </div>
                          {emp.department && (
                            <div className="text-xs text-muted-foreground">
                              Current: {emp.department}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAssignOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAssign} disabled={selectedEmployees.size === 0}>
                  Assign {selectedEmployees.size} Employee(s)
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading departments...</div>
      ) : departments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No departments yet</p>
          <p className="text-sm mt-2">Create your first department to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map(dept => (
            <div
              key={dept.name}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {dept.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">
                      <Users className="w-3 h-3 mr-1" />
                      {dept.employeeCount} {dept.employeeCount === 1 ? 'employee' : 'employees'}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setSelectedDept(dept.name)
                      setDeptName(dept.name)
                      setEditOpen(true)
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => {
                      setSelectedDept(dept.name)
                      setDeleteOpen(true)
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Rename the department. This will update all employees in this department.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editDeptName">Department Name</Label>
              <Input
                id="editDeptName"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder="Department name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedDept}"? This will remove the department
              from all employees but will not delete the employees themselves.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

