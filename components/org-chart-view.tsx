'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  User, 
  Settings2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  GitBranch,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { getPublicUrl } from '@/lib/storage'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Employee {
  id: string
  employeeId: string
  team: string | null
  photo: string | null
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

export function OrgChartView({ employees, canEdit }: OrgChartViewProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [zoom, setZoom] = useState(1)
  const [layout, setLayout] = useState<'hierarchical' | 'grid' | 'tree'>('hierarchical')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [selectedTeam, setSelectedTeam] = useState<string>('all')

  // Build tree structure
  const tree = useMemo(() => {
    const employeeMap = new Map<string, TreeNode>()
    
    // Create nodes
    employees.forEach(emp => {
      employeeMap.set(emp.id, { ...emp, children: [] })
    })

    // Build tree
    const roots: TreeNode[] = []
    employees.forEach(emp => {
      const node = employeeMap.get(emp.id)!
      if (emp.reportingTo) {
        const parent = employeeMap.get(emp.reportingTo.id)
        if (parent) {
          parent.children.push(node)
        } else {
          roots.push(node)
        }
      } else {
        roots.push(node)
      }
    })

    // Filter by team if selected
    if (selectedTeam !== 'all') {
      const filterTree = (nodes: TreeNode[]): TreeNode[] => {
        return nodes
          .filter(node => node.team === selectedTeam || node.children.length > 0)
          .map(node => ({
            ...node,
            children: filterTree(node.children),
          }))
      }
      return filterTree(roots)
    }

    return roots
  }, [employees, selectedTeam])

  const teams = useMemo(() => {
    const teamSet = new Set(employees.map(e => e.team).filter(Boolean))
    return Array.from(teamSet).sort()
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

  const handleUpdateReporting = async (employeeId: string, newManagerId: string | null) => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/reporting`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportingToId: newManagerId }),
      })

      if (!response.ok) {
        throw new Error('Failed to update reporting structure')
      }

      toast({
        title: 'Success',
        description: 'Reporting structure updated',
      })

      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update',
        variant: 'destructive',
      })
    }
  }

  const renderNode = (node: TreeNode, level: number = 0, isExpanded: boolean = true) => {
    const hasChildren = node.children.length > 0
    const isNodeExpanded = expandedNodes.has(node.id) || level === 0

    return (
      <div key={node.id} className="flex flex-col items-center">
        <Card className={`relative p-5 min-w-[220px] max-w-[260px] hover:shadow-lg transition-all ${
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

              {/* Role & Team */}
              <div className="flex flex-wrap gap-1 justify-center mb-2">
                <Badge variant="secondary" className="text-xs">
                  {node.user.role.replace('_', ' ')}
                </Badge>
                {node.team && (
                  <Badge variant="outline" className="text-xs">
                    {node.team}
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

        {/* Expand/Collapse button - positioned inside card */}
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
                    {renderNode(child, level + 1, isNodeExpanded)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by team" />
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

            <Select value={layout} onValueChange={(v: any) => setLayout(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hierarchical">Hierarchical</SelectItem>
                <SelectItem value="tree">Tree View</SelectItem>
                <SelectItem value="grid">Grid View</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
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
              {selectedTeam !== 'all' && (
                <p className="text-sm mt-2">Try selecting a different team</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-8">
              {tree.map(root => renderNode(root, 0))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

