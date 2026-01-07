'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Users, 
  User, 
  Settings2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  GitBranch,
  ChevronDown,
  ChevronRight,
  Search,
  Download,
  BarChart3,
  Filter,
  Building2,
  MapPin,
  Briefcase,
  Calendar,
  X
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDate } from '@/lib/utils'
import { DepartmentManager } from './department-manager'

interface Employee {
  id: string
  employeeId: string
  team: string | null
  department: string | null
  jobTitle: string | null
  location: string | null
  hireDate: Date | null
  photo: string | null
  status?: string | null
  user: {
    id: string
    name: string | null
    email: string
    role: string
  }
  reportingTo: {
    id: string
    user: {
      id: string
      name: string | null
      email: string
      role: string
    }
  } | null
  reports: Array<{
    id: string
    user: {
      id: string
      name: string | null
      email: string
      role: string
    }
  }>
}

interface OrgChartViewProps {
  employees: Employee[]
  canEdit: boolean
}

interface TreeNode extends Employee {
  children: TreeNode[]
}

interface OrgMetrics {
  totalEmployees: number
  totalDepartments: number
  totalTeams: number
  avgSpanOfControl: number
  maxDepth: number
  topLevelManagers: number
}

export function EnhancedOrgChartView({ employees, canEdit }: OrgChartViewProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [zoom, setZoom] = useState(1)
  const [layout, setLayout] = useState<'hierarchical' | 'grid' | 'tree'>('hierarchical')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [selectedTeam, setSelectedTeam] = useState<string>('all')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [selectedLocation, setSelectedLocation] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showMetrics, setShowMetrics] = useState(true)

  // Calculate metrics
  const metrics: OrgMetrics = useMemo(() => {
    const departments = new Set(employees.map(e => e.department).filter(Boolean))
    const teams = new Set(employees.map(e => e.team).filter(Boolean))
    const managers = employees.filter(e => e.reports.length > 0)
    const totalReports = managers.reduce((sum, m) => sum + m.reports.length, 0)
    const avgSpanOfControl = managers.length > 0 ? totalReports / managers.length : 0
    
    // Calculate max depth
    const calculateDepth = (empId: string, visited: Set<string> = new Set()): number => {
      if (visited.has(empId)) return 0
      visited.add(empId)
      const emp = employees.find(e => e.id === empId)
      if (!emp || !emp.reportingTo) return 1
      return 1 + calculateDepth(emp.reportingTo.id, visited)
    }
    const maxDepth = Math.max(...employees.map(e => calculateDepth(e.id)))
    
    const topLevelManagers = employees.filter(e => !e.reportingTo && e.reports.length > 0).length

    return {
      totalEmployees: employees.length,
      totalDepartments: departments.size,
      totalTeams: teams.size,
      avgSpanOfControl: Math.round(avgSpanOfControl * 10) / 10,
      maxDepth,
      topLevelManagers,
    }
  }, [employees])

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesTeam = selectedTeam === 'all' || emp.team === selectedTeam
      const matchesDept = selectedDepartment === 'all' || emp.department === selectedDepartment
      const matchesLocation = selectedLocation === 'all' || emp.location === selectedLocation
      const matchesSearch = !searchQuery || 
        emp.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
      
      return matchesTeam && matchesDept && matchesLocation && matchesSearch
    })
  }, [employees, selectedTeam, selectedDepartment, selectedLocation, searchQuery])

  // Build tree structure
  const tree = useMemo(() => {
    const employeeMap = new Map<string, TreeNode>()
    
    // Create nodes
    filteredEmployees.forEach(emp => {
      employeeMap.set(emp.id, { ...emp, children: [] })
    })

    // Build tree
    const roots: TreeNode[] = []
    filteredEmployees.forEach(emp => {
      const node = employeeMap.get(emp.id)!
      if (emp.reportingTo && employeeMap.has(emp.reportingTo.id)) {
        const parent = employeeMap.get(emp.reportingTo.id)!
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    })

    // Sort children by name for consistent display
    const sortChildren = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        node.children.sort((a, b) => 
          (a.user.name || a.user.email).localeCompare(b.user.name || b.user.email)
        )
        sortChildren(node.children)
      })
    }
    sortChildren(roots)

    return roots
  }, [filteredEmployees])

  // Build employee map for department view (separate from tree)
  const employeeMapForDept = useMemo(() => {
    const map = new Map<string, TreeNode>()
    filteredEmployees.forEach(emp => {
      map.set(emp.id, { ...emp, children: [] })
    })
    filteredEmployees.forEach(emp => {
      const node = map.get(emp.id)!
      if (emp.reportingTo && map.has(emp.reportingTo.id)) {
        const parent = map.get(emp.reportingTo.id)!
        parent.children.push(node)
      }
    })
    return map
  }, [filteredEmployees])

  const teams = useMemo(() => {
    const teamSet = new Set(employees.map(e => e.team).filter(Boolean))
    return Array.from(teamSet).sort()
  }, [employees])

  const departments = useMemo(() => {
    const deptSet = new Set(employees.map(e => e.department).filter(Boolean))
    return Array.from(deptSet).sort()
  }, [employees])

  const locations = useMemo(() => {
    const locSet = new Set(employees.map(e => e.location).filter(Boolean))
    return Array.from(locSet).sort()
  }, [employees])

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const expandAll = () => {
    const allIds = new Set(filteredEmployees.map(e => e.id))
    setExpandedNodes(allIds)
  }

  const collapseAll = () => {
    setExpandedNodes(new Set())
  }

  const handleUpdateReporting = async (employeeId: string, newManagerId: string | null) => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/reporting`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportingToId: newManagerId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update reporting structure')
      }

      toast({
        title: 'Success',
        description: 'Reporting structure updated successfully',
      })

      router.refresh()
    } catch (error: any) {
      console.error('Update reporting error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update reporting structure',
        variant: 'destructive',
      })
    }
  }

  const exportOrgChart = () => {
    const data = filteredEmployees.map(emp => ({
      name: emp.user.name || emp.user.email,
      email: emp.user.email,
      employeeId: emp.employeeId,
      jobTitle: emp.jobTitle || '',
      department: emp.department || '',
      team: emp.team || '',
      location: emp.location || '',
      manager: emp.reportingTo?.user.name || emp.reportingTo?.user.email || '',
      directReports: emp.reports.length,
    }))

    const csv = [
      ['Name', 'Email', 'Employee ID', 'Job Title', 'Department', 'Team', 'Location', 'Manager', 'Direct Reports'],
      ...data.map(row => [
        row.name,
        row.email,
        row.employeeId,
        row.jobTitle,
        row.department,
        row.team,
        row.location,
        row.manager,
        row.directReports.toString(),
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `org-chart-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast({
      title: 'Success',
      description: 'Org chart exported successfully',
    })
  }

  const clearFilters = () => {
    setSelectedTeam('all')
    setSelectedDepartment('all')
    setSelectedLocation('all')
    setSearchQuery('')
  }

  const hasActiveFilters = selectedTeam !== 'all' || 
    selectedDepartment !== 'all' || 
    selectedLocation !== 'all' || 
    searchQuery !== ''

  const renderNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children.length > 0
    const isNodeExpanded = expandedNodes.has(node.id) || level === 0

    return (
      <div key={node.id} className="flex flex-col items-center">
        <Card className={`relative p-5 min-w-[240px] max-w-[280px] hover:shadow-lg transition-all ${
          level === 0 ? 'border-2 border-primary shadow-md' : ''
        }`}>
          <Link href={`/profiles/employee/${node.id}`}>
            <div className="flex flex-col items-center text-center cursor-pointer group">
              {/* Photo */}
              {node.photo ? (
                <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-background shadow-md mb-2 group-hover:scale-110 transition-transform">
                  <img
                    src={node.photo.startsWith('http') ? node.photo : `/api/files/${node.photo}`}
                    alt={node.user.name || 'Employee'}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-xl font-bold text-primary-foreground shadow-md mb-2 group-hover:scale-110 transition-transform">
                  {node.user.name?.[0]?.toUpperCase() || node.user.email[0].toUpperCase()}
                </div>
              )}

              {/* Name */}
              <h3 className="font-semibold text-sm mb-1 line-clamp-1">
                {node.user.name || 'Employee'}
              </h3>

              {/* Job Title */}
              {node.jobTitle && (
                <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                  {node.jobTitle}
                </p>
              )}

              {/* Badges */}
              <div className="flex flex-wrap gap-1 justify-center mb-2">
                <Badge variant="secondary" className="text-xs">
                  {node.user.role.replace('_', ' ')}
                </Badge>
                {node.department && (
                  <Badge variant="outline" className="text-xs">
                    <Building2 className="w-2.5 h-2.5 mr-1" />
                    {node.department}
                  </Badge>
                )}
                {node.team && (
                  <Badge variant="outline" className="text-xs">
                    {node.team}
                  </Badge>
                )}
                {node.location && (
                  <Badge variant="outline" className="text-xs">
                    <MapPin className="w-2.5 h-2.5 mr-1" />
                    {node.location}
                  </Badge>
                )}
              </div>

              {/* Stats */}
              {hasChildren && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {node.children.length} direct report{node.children.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </Link>

          {/* Edit reporting (if can edit) */}
          {canEdit && (
            <div className="mt-3 pt-3 border-t">
              <Select
                value={node.reportingTo?.id || 'none'}
                onValueChange={(value) => {
                  handleUpdateReporting(node.id, value === 'none' ? null : value)
                }}
              >
                <SelectTrigger className="h-8 text-xs w-full">
                  <SelectValue placeholder="Reports to..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Manager (Top Level)</SelectItem>
                  {employees
                    .filter(e => e.id !== node.id)
                    .map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.user.name || emp.user.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </Card>

        {/* Expand/Collapse button */}
        {hasChildren && (
          <div className="mt-3 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => toggleNode(node.id)}
            >
              {isNodeExpanded ? (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  <span className="text-xs">Collapse</span>
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4 mr-1" />
                  <span className="text-xs">Expand ({node.children.length})</span>
                </>
              )}
            </Button>
          </div>
        )}

        {/* Children */}
        {hasChildren && isNodeExpanded && (
          <div className="mt-4 flex items-start">
            <div className="flex flex-col items-center w-full">
              {/* Connector line */}
              <div className="w-0.5 h-4 bg-border mb-4" />
              {/* Children container */}
              <div className="flex gap-6 items-start justify-center flex-wrap">
                {node.children.map((child) => (
                  <div key={child.id} className="flex flex-col items-center">
                    {renderNode(child, level + 1)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Group employees by department for department view
  const employeesByDepartment = useMemo(() => {
    const deptMap = new Map<string, Employee[]>()
    filteredEmployees.forEach(emp => {
      const dept = emp.department || 'Unassigned'
      if (!deptMap.has(dept)) {
        deptMap.set(dept, [])
      }
      deptMap.get(dept)!.push(emp)
    })
    return deptMap
  }, [filteredEmployees])

  // Build tree with same-level peers grouped
  const treeWithPeers = useMemo(() => {
    const employeeMap = new Map<string, TreeNode>()
    
    // Create nodes
    filteredEmployees.forEach(emp => {
      employeeMap.set(emp.id, { ...emp, children: [] })
    })

    // Build tree
    const roots: TreeNode[] = []
    filteredEmployees.forEach(emp => {
      const node = employeeMap.get(emp.id)!
      if (emp.reportingTo && employeeMap.has(emp.reportingTo.id)) {
        const parent = employeeMap.get(emp.reportingTo.id)!
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    })

    // Sort children by name for consistent display
    const sortChildren = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        node.children.sort((a, b) => 
          (a.user.name || a.user.email).localeCompare(b.user.name || b.user.email)
        )
        sortChildren(node.children)
      })
    }
    sortChildren(roots)

    return roots
  }, [filteredEmployees])

  return (
    <div className="space-y-4">
      {/* Department Management */}
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>Department Management</CardTitle>
          </CardHeader>
          <CardContent>
            <DepartmentManager employees={employees as any} canEdit={canEdit} />
          </CardContent>
        </Card>
      )}

      {/* Metrics Card */}
      {showMetrics && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Organization Metrics
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMetrics(!showMetrics)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{metrics.totalEmployees}</div>
                <div className="text-xs text-muted-foreground mt-1">Employees</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{metrics.totalDepartments}</div>
                <div className="text-xs text-muted-foreground mt-1">Departments</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{metrics.totalTeams}</div>
                <div className="text-xs text-muted-foreground mt-1">Teams</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{metrics.avgSpanOfControl}</div>
                <div className="text-xs text-muted-foreground mt-1">Avg Span</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{metrics.maxDepth}</div>
                <div className="text-xs text-muted-foreground mt-1">Max Depth</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{metrics.topLevelManagers}</div>
                <div className="text-xs text-muted-foreground mt-1">Top Managers</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-1 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filters */}
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams.map(team => (
                  <SelectItem key={team} value={team}>
                    {team}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={expandAll}
            >
              Expand All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={collapseAll}
            >
              Collapse All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportOrgChart}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.min(2, zoom + 0.1))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setExpandedNodes(new Set())
                setZoom(1)
              }}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Chart */}
      <div className="border rounded-lg p-8 bg-muted/20 overflow-auto min-h-[600px]">
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            minHeight: '100%',
          }}
          className="flex flex-col items-center"
        >
          {tree.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No employees found</p>
              {hasActiveFilters && (
                <p className="text-sm mt-2">Try adjusting your filters</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-8 w-full">
              {selectedDepartment !== 'all' ? (
                // Department view - show all employees in department grouped by manager
                <div className="w-full space-y-8">
                  {Array.from(employeesByDepartment.entries()).map(([deptName, deptEmployees]) => {
                    if (selectedDepartment !== 'all' && deptName !== selectedDepartment) return null
                    
                    // Group by manager
                    const byManager = new Map<string | null, Employee[]>()
                    deptEmployees.forEach(emp => {
                      const managerId = emp.reportingTo?.id || null
                      if (!byManager.has(managerId)) {
                        byManager.set(managerId, [])
                      }
                      byManager.get(managerId)!.push(emp)
                    })

                    return (
                      <div key={deptName} className="w-full">
                        <div className="mb-4 text-center">
                          <Badge variant="secondary" className="text-lg px-4 py-2">
                            <Building2 className="w-4 h-4 mr-2" />
                            {deptName}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-2">
                            {deptEmployees.length} {deptEmployees.length === 1 ? 'employee' : 'employees'}
                          </p>
                        </div>
                        
                        {/* Show employees grouped by their manager, or as peers if same manager */}
                        <div className="flex flex-col items-center gap-6">
                          {Array.from(byManager.entries()).map(([managerId, peers]) => {
                            if (managerId) {
                              const manager = employees.find(e => e.id === managerId)
                              if (!manager) return null
                              
                              const managerNode = employeeMapForDept.get(managerId)
                              if (!managerNode) return null
                              
                              return (
                                <div key={managerId} className="flex flex-col items-center">
                                  {renderNode(managerNode, 0)}
                                  {peers.length > 0 && (
                                    <div className="mt-4 flex gap-4 items-start justify-center flex-wrap">
                                      {peers.map(peer => {
                                        const peerNode = employeeMapForDept.get(peer.id)
                                        if (!peerNode) return null
                                        return (
                                          <div key={peer.id} className="flex flex-col items-center">
                                            {renderNode(peerNode, 1)}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )
                            } else {
                              // Top-level employees (no manager) - show as peers
                              return (
                                <div key="top-level" className="flex gap-4 items-start justify-center flex-wrap">
                                  {peers.map(peer => {
                                    const peerNode = employeeMapForDept.get(peer.id)
                                    if (!peerNode) return null
                                    return (
                                      <div key={peer.id} className="flex flex-col items-center">
                                        {renderNode(peerNode, 0)}
                                      </div>
                                    )
                                  })}
                                </div>
                              )
                            }
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                // Standard hierarchical view
                <div className="flex flex-col items-center gap-8">
                  {tree.map(root => renderNode(root, 0))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

