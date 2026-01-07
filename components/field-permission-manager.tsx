'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Save, 
  Search, 
  Info, 
  Eye, 
  Edit, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Users,
  FileText,
  Music,
  Globe
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { UserRole } from '@prisma/client'

type EntityType = 'release' | 'track' | 'platform_request'

interface FieldPermission {
  id?: string
  fieldName: string
  entityType: EntityType
  role: UserRole
  canView: boolean
  canEdit: boolean
  isRequired: boolean
}

// Human-readable field labels and descriptions
const FIELD_METADATA: Record<EntityType, Record<string, { label: string; description: string; category: string }>> = {
  release: {
    title: { label: 'Release Title', description: 'The name of the music release', category: 'Basic Information' },
    releaseType: { label: 'Release Type', description: 'Whether this is a Single or Album', category: 'Basic Information' },
    artistsChosenDate: { label: "Artist's Chosen Date", description: 'Preferred release date selected by the artist', category: 'Dates' },
    legacyReleaseDate: { label: 'Legacy Release Date', description: 'Historical release date from legacy systems', category: 'Dates' },
    copyrightStatus: { label: 'Copyright Status', description: 'Current copyright status of the release', category: 'Legal' },
    videoType: { label: 'Video Type', description: 'Type of video content (if any)', category: 'Media' },
    assignedA_RId: { label: 'Assigned A&R', description: 'A&R employee assigned to manage this release', category: 'Management' },
    status: { label: 'Status', description: 'Current status of the release workflow', category: 'Management' },
  },
  track: {
    name: { label: 'Song Name', description: 'The title of the song/track', category: 'Basic Information' },
    trackNumber: { label: 'Track Number', description: 'Position of this track in the album', category: 'Basic Information' },
    performer: { label: 'Artist', description: 'Artist who performs the song', category: 'Credits' },
    composer: { label: 'Composer', description: 'Person who wrote/composed the music', category: 'Credits' },
    band: { label: 'Band/Music Producer', description: 'Band name or music producer', category: 'Credits' },
    musicProducer: { label: 'Music Producer', description: 'Person who produced the music', category: 'Credits' },
    studio: { label: 'Studio', description: 'Recording studio where the track was recorded', category: 'Production' },
    recordLabel: { label: 'Record Label', description: 'Label that owns or distributes the track', category: 'Production' },
    genre: { label: 'Genre', description: 'Musical genre classification', category: 'Classification' },
  },
  platform_request: {
    platform: { label: 'Platform', description: 'Distribution platform (YouTube, Flow, etc.)', category: 'Platform' },
    status: { label: 'Status', description: 'Current status of the platform request', category: 'Status' },
    uploadLink: { label: 'Upload Link', description: 'URL where the content is uploaded', category: 'Links' },
    channelName: { label: 'Channel Name', description: 'Name of the channel on the platform', category: 'Channel' },
    channelId: { label: 'Channel ID', description: 'Unique identifier for the channel', category: 'Channel' },
    requestedAt: { label: 'Requested At', description: 'When the platform request was created', category: 'Timestamps' },
    uploadedAt: { label: 'Uploaded At', description: 'When the content was uploaded', category: 'Timestamps' },
    approvedAt: { label: 'Approved At', description: 'When the request was approved', category: 'Timestamps' },
    rejectedAt: { label: 'Rejected At', description: 'When the request was rejected', category: 'Timestamps' },
  },
}

const ENTITY_ICONS = {
  release: FileText,
  track: Music,
  platform_request: Globe,
}

const ENTITY_LABELS = {
  release: 'Release',
  track: 'Track',
  platform_request: 'Platform Request',
}

const ALL_ROLES = Object.values(UserRole)

// Group fields by category
const getFieldCategories = (entity: EntityType): string[] => {
  const categories = new Set<string>()
  Object.values(FIELD_METADATA[entity]).forEach(field => {
    categories.add(field.category)
  })
  return Array.from(categories).sort()
}

const getFieldsByCategory = (entity: EntityType, category: string): string[] => {
  return Object.entries(FIELD_METADATA[entity])
    .filter(([_, meta]) => meta.category === category)
    .map(([fieldName]) => fieldName)
}

export function FieldPermissionManager() {
  const { toast } = useToast()
  const [selectedEntity, setSelectedEntity] = useState<EntityType>('release')
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all')
  const [permissions, setPermissions] = useState<FieldPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadPermissions()
  }, [selectedEntity])

  const loadPermissions = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/permissions?entityType=${selectedEntity}`)
      if (response.ok) {
        const data = await response.json()
        setPermissions(data || [])
        setHasChanges(false)
      }
    } catch (error) {
      console.error('Error loading permissions:', error)
      toast({
        title: 'Error',
        description: 'Failed to load permissions',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (
    fieldName: string,
    role: UserRole,
    property: 'canView' | 'canEdit' | 'isRequired'
  ) => {
    const existing = permissions.find(
      p => p.fieldName === fieldName && p.role === role && p.entityType === selectedEntity
    )

    const updated: FieldPermission = existing
      ? { ...existing, [property]: !existing[property] }
      : {
          fieldName,
          entityType: selectedEntity,
          role,
          canView: property === 'canView' ? true : property === 'isRequired' ? true : false,
          canEdit: property === 'canEdit' ? true : false,
          isRequired: property === 'isRequired' ? true : false,
        }

    setPermissions(prev =>
      prev.filter(p => !(p.fieldName === fieldName && p.role === role && p.entityType === selectedEntity))
        .concat(updated)
    )
    setHasChanges(true)
  }

  const handleBulkToggle = (
    fieldName: string,
    property: 'canView' | 'canEdit' | 'isRequired',
    value: boolean
  ) => {
    const updatedPermissions: FieldPermission[] = []
    
    ALL_ROLES.forEach(role => {
      const existing = permissions.find(
        p => p.fieldName === fieldName && p.role === role && p.entityType === selectedEntity
      )
      
      const updated: FieldPermission = existing
        ? { ...existing, [property]: value }
        : {
            fieldName,
            entityType: selectedEntity,
            role,
            canView: property === 'canView' ? value : (property === 'isRequired' ? true : false),
            canEdit: property === 'canEdit' ? value : false,
            isRequired: property === 'isRequired' ? value : false,
          }
      
      updatedPermissions.push(updated)
    })
    
    setPermissions(prev =>
      prev.filter(p => !(p.fieldName === fieldName && p.entityType === selectedEntity && ALL_ROLES.includes(p.role)))
        .concat(updatedPermissions)
    )
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: selectedEntity,
          permissions: permissions.filter(p => p.entityType === selectedEntity),
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Permissions saved successfully',
        })
        setHasChanges(false)
        loadPermissions()
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save permissions',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const getPermission = (fieldName: string, role: UserRole): FieldPermission | undefined => {
    return permissions.find(
      p => p.fieldName === fieldName && p.role === role && p.entityType === selectedEntity
    )
  }

  const categories = getFieldCategories(selectedEntity)

  // Filter fields based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories
    
    return categories.filter(category => {
      const fields = getFieldsByCategory(selectedEntity, category)
      return fields.some(fieldName => {
        const meta = FIELD_METADATA[selectedEntity][fieldName]
        return meta.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
               meta.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
               fieldName.toLowerCase().includes(searchQuery.toLowerCase())
      })
    })
  }, [categories, searchQuery, selectedEntity])

  const getFilteredFields = (category: string): string[] => {
    const fields = getFieldsByCategory(selectedEntity, category)
    if (!searchQuery) return fields
    
    return fields.filter(fieldName => {
      const meta = FIELD_METADATA[selectedEntity][fieldName]
      return meta.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
             meta.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
             fieldName.toLowerCase().includes(searchQuery.toLowerCase())
    })
  }

  const rolesToShow = selectedRole === 'all' ? ALL_ROLES : [selectedRole]

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header with Entity Tabs and Role Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Tabs value={selectedEntity} onValueChange={(v) => { setSelectedEntity(v as EntityType); setSearchQuery('') }}>
            <TabsList className="grid w-full sm:w-auto grid-cols-3">
              <TabsTrigger value="release" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Release</span>
              </TabsTrigger>
              <TabsTrigger value="track" className="flex items-center gap-2">
                <Music className="w-4 h-4" />
                <span className="hidden sm:inline">Track</span>
              </TabsTrigger>
              <TabsTrigger value="platform_request" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">Platform</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as UserRole | 'all')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {ALL_ROLES.map(role => (
                    <SelectItem key={role} value={role}>
                      {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleSave} 
              disabled={saving || !hasChanges}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder={`Search ${ENTITY_LABELS[selectedEntity].toLowerCase()} fields...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Permissions Content */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading permissions...
          </div>
        ) : (
          <div className="space-y-6">
            {filteredCategories.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No fields found matching "{searchQuery}"</p>
                </CardContent>
              </Card>
            ) : (
              filteredCategories.map(category => {
                const fields = getFilteredFields(category)
                if (fields.length === 0) return null

                return (
                  <Card key={category} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{category}</CardTitle>
                      <CardDescription>
                        {fields.length} field{fields.length !== 1 ? 's' : ''} in this category
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {fields.map(fieldName => {
                        const meta = FIELD_METADATA[selectedEntity][fieldName]
                        if (!meta) return null

                        return (
                          <div key={fieldName} className="border rounded-lg p-4 space-y-4 hover:bg-muted/30 transition-colors">
                            {/* Field Header */}
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Label className="text-base font-semibold">{meta.label}</Label>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p className="font-medium mb-1">{meta.label}</p>
                                      <p className="text-xs">{meta.description}</p>
                                      <p className="text-xs mt-2 text-muted-foreground">Field: {fieldName}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <p className="text-sm text-muted-foreground">{meta.description}</p>
                              </div>
                              <Badge variant="outline" className="font-mono text-xs shrink-0">
                                {fieldName}
                              </Badge>
                            </div>

                            {/* Permissions Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t">
                              {rolesToShow.map(role => {
                                const perm = getPermission(fieldName, role)
                                return (
                                  <div key={role} className="space-y-3 p-3 rounded-md bg-muted/20">
                                    <div className="flex items-center justify-between">
                                      <Badge variant="secondary" className="text-xs">
                                        {role.replace('_', ' ')}
                                      </Badge>
                                    </div>
                                    
                                    <div className="space-y-2">
                                      {/* View Permission */}
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <Eye className="w-4 h-4 text-muted-foreground" />
                                          <Label className="text-sm font-normal">View</Label>
                                        </div>
                                        <Switch
                                          checked={perm?.canView ?? true}
                                          onCheckedChange={() => handleToggle(fieldName, role, 'canView')}
                                        />
                                      </div>

                                      {/* Edit Permission */}
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <Edit className="w-4 h-4 text-muted-foreground" />
                                          <Label className="text-sm font-normal">Edit</Label>
                                        </div>
                                        <Switch
                                          checked={perm?.canEdit ?? false}
                                          onCheckedChange={() => handleToggle(fieldName, role, 'canEdit')}
                                          disabled={perm?.canView === false}
                                        />
                                      </div>

                                      {/* Required Permission */}
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <AlertCircle className="w-4 h-4 text-muted-foreground" />
                                          <Label className="text-sm font-normal">Required</Label>
                                        </div>
                                        <Switch
                                          checked={perm?.isRequired ?? false}
                                          onCheckedChange={() => handleToggle(fieldName, role, 'isRequired')}
                                          disabled={perm?.canView === false}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>

                            {/* Bulk Actions */}
                            {selectedRole === 'all' && (
                              <div className="flex items-center gap-2 pt-2 border-t">
                                <span className="text-xs text-muted-foreground">Bulk actions:</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleBulkToggle(fieldName, 'canView', true)}
                                >
                                  Allow View All
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleBulkToggle(fieldName, 'canEdit', true)}
                                >
                                  Allow Edit All
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleBulkToggle(fieldName, 'isRequired', false)}
                                >
                                  Clear Required
                                </Button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        )}

        {/* Help Card */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="space-y-2 text-sm">
                <p className="font-medium">Understanding Permissions</p>
                <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                  <li><strong>View:</strong> Users with this role can see this field</li>
                  <li><strong>Edit:</strong> Users can modify this field (requires View permission)</li>
                  <li><strong>Required:</strong> This field must be filled when submitting forms (requires View permission)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
