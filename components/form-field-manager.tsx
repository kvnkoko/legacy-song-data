'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Save, Edit2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface FormField {
  id: string
  name: string
  label: string
  labelMy?: string // Myanmar translation
  placeholder?: string
  placeholderMy?: string // Myanmar placeholder
  type: 'text' | 'email' | 'tel' | 'date' | 'select' | 'textarea'
  required: boolean
  section: 'artist' | 'release' | 'track'
  order: number
  options?: string[] // For select fields
}

const DEFAULT_FIELDS: FormField[] = [
  { 
    id: 'artistName', 
    name: 'artistName', 
    label: 'Artist Name', 
    labelMy: 'အနုပညာရှင် အမည်',
    placeholder: 'Type to search existing artists or enter a new name',
    placeholderMy: 'ရှိပြီးသား အနုပညာရှင်များကို ရှာဖွေရန် သို့မဟုတ် အမည်အသစ် ထည့်သွင်းရန်',
    type: 'text', 
    required: true, 
    section: 'artist', 
    order: 1 
  },
  { 
    id: 'legalName', 
    name: 'legalName', 
    label: 'Legal Name', 
    labelMy: 'တရားဝင် အမည်',
    placeholder: 'Enter legal name (optional)',
    placeholderMy: 'တရားဝင် အမည် ထည့်သွင်းရန် (မဖြစ်မနေ မဟုတ်ပါ)',
    type: 'text', 
    required: false, 
    section: 'artist', 
    order: 2 
  },
  { 
    id: 'contactEmail', 
    name: 'contactEmail', 
    label: 'Contact Email', 
    labelMy: 'ဆက်သွယ်ရန် အီးမေးလ်',
    placeholder: 'your@email.com (optional)',
    placeholderMy: 'your@email.com (မဖြစ်မနေ မဟုတ်ပါ)',
    type: 'email', 
    required: false, 
    section: 'artist', 
    order: 3 
  },
  { 
    id: 'contactPhone', 
    name: 'contactPhone', 
    label: 'Contact Phone', 
    labelMy: 'ဆက်သွယ်ရန် ဖုန်း',
    placeholder: '+1 234 567 8900 (optional)',
    placeholderMy: '+95 9 123 456 789 (မဖြစ်မနေ မဟုတ်ပါ)',
    type: 'tel', 
    required: false, 
    section: 'artist', 
    order: 4 
  },
  { 
    id: 'releaseType', 
    name: 'releaseType', 
    label: 'Release Type', 
    labelMy: 'ထုတ်ဝေမှု အမျိုးအစား',
    type: 'select', 
    required: true, 
    section: 'release', 
    order: 1, 
    options: ['SINGLE', 'ALBUM'] 
  },
  { 
    id: 'releaseTitle', 
    name: 'releaseTitle', 
    label: 'Release Title', 
    labelMy: 'ထုတ်ဝေမှု ခေါင်းစဉ်',
    placeholder: 'Enter release title',
    placeholderMy: 'ထုတ်ဝေမှု ခေါင်းစဉ် ထည့်သွင်းရန်',
    type: 'text', 
    required: true, 
    section: 'release', 
    order: 2 
  },
  { 
    id: 'artistsChosenDate', 
    name: 'artistsChosenDate', 
    label: "Artist's Chosen Date", 
    labelMy: 'အနုပညာရှင် ရွေးချယ်ထားသော ရက်စွဲ',
    type: 'date', 
    required: false, 
    section: 'release', 
    order: 3 
  },
  { 
    id: 'songName', 
    name: 'songName', 
    label: 'Song Name', 
    labelMy: 'တေးသီချင်း အမည်',
    placeholder: 'Enter song name',
    placeholderMy: 'တေးသီချင်း အမည် ထည့်သွင်းရန်',
    type: 'text', 
    required: true, 
    section: 'track', 
    order: 1 
  },
  { 
    id: 'performer', 
    name: 'performer', 
    label: 'Artist', 
    labelMy: 'ဖျော်ဖြေသူ',
    placeholder: 'Enter performer',
    placeholderMy: 'ဖျော်ဖြေသူ ထည့်သွင်းရန်',
    type: 'text', 
    required: false, 
    section: 'track', 
    order: 2 
  },
  { 
    id: 'composer', 
    name: 'composer', 
    label: 'Composer', 
    labelMy: 'ရေးစပ်သူ',
    placeholder: 'Enter composer',
    placeholderMy: 'ရေးစပ်သူ ထည့်သွင်းရန်',
    type: 'text', 
    required: false, 
    section: 'track', 
    order: 3 
  },
  { 
    id: 'band', 
    name: 'band', 
    label: 'Band', 
    labelMy: 'တီးဝိုင်း',
    placeholder: 'Enter band',
    placeholderMy: 'တီးဝိုင်း ထည့်သွင်းရန်',
    type: 'text', 
    required: false, 
    section: 'track', 
    order: 4 
  },
  { 
    id: 'musicProducer', 
    name: 'musicProducer', 
    label: 'Music Producer', 
    labelMy: 'ဂီတ ထုတ်လုပ်သူ',
    placeholder: 'Enter music producer',
    placeholderMy: 'ဂီတ ထုတ်လုပ်သူ ထည့်သွင်းရန်',
    type: 'text', 
    required: false, 
    section: 'track', 
    order: 5 
  },
  { 
    id: 'studio', 
    name: 'studio', 
    label: 'Studio', 
    labelMy: 'စတူဒီယို',
    placeholder: 'Enter studio',
    placeholderMy: 'စတူဒီယို ထည့်သွင်းရန်',
    type: 'text', 
    required: false, 
    section: 'track', 
    order: 6 
  },
  { 
    id: 'recordLabel', 
    name: 'recordLabel', 
    label: 'Record Label', 
    labelMy: 'ဓာတ်ပြား လေဘယ်',
    placeholder: 'Enter record label',
    placeholderMy: 'ဓာတ်ပြား လေဘယ် ထည့်သွင်းရန်',
    type: 'text', 
    required: false, 
    section: 'track', 
    order: 7 
  },
  { 
    id: 'genre', 
    name: 'genre', 
    label: 'Genre', 
    labelMy: 'အမျိုးအစား',
    placeholder: 'Enter genre',
    placeholderMy: 'အမျိုးအစား ထည့်သွင်းရန်',
    type: 'text', 
    required: false, 
    section: 'track', 
    order: 8 
  },
]

export function FormFieldManager() {
  const { toast } = useToast()
  const [fields, setFields] = useState<FormField[]>(DEFAULT_FIELDS)
  const [newField, setNewField] = useState<Partial<FormField>>({
    name: '',
    label: '',
    type: 'text',
    required: false,
    section: 'artist',
    order: 0,
  })
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingField, setEditingField] = useState<FormField | null>(null)

  useEffect(() => {
    // Load saved fields from API
    fetch('/api/admin/form-fields')
      .then(res => res.json())
      .then(data => {
        if (data.fields && data.fields.length > 0) {
          setFields(data.fields)
        }
        // Otherwise use defaults
      })
      .catch(() => {
        // Use defaults if API fails
      })
  }, [])

  const handleSave = async () => {
    try {
      const response = await fetch('/api/admin/form-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      })

      if (!response.ok) {
        throw new Error('Failed to save fields')
      }

      toast({
        title: 'Success',
        description: 'Form fields saved successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save form fields',
        variant: 'destructive',
      })
    }
  }

  const handleAddField = () => {
    if (!newField.name || !newField.label) {
      toast({
        title: 'Error',
        description: 'Name and label are required',
        variant: 'destructive',
      })
      return
    }

    const field: FormField = {
      id: newField.name.toLowerCase().replace(/\s+/g, '_'),
      name: newField.name.toLowerCase().replace(/\s+/g, '_'),
      label: newField.label,
      labelMy: newField.labelMy,
      placeholder: newField.placeholder,
      placeholderMy: newField.placeholderMy,
      type: newField.type || 'text',
      required: newField.required || false,
      section: newField.section || 'artist',
      order: fields.filter(f => f.section === newField.section).length + 1,
      options: newField.type === 'select' ? [] : undefined,
    }

    setFields([...fields, field])
    setNewField({
      name: '',
      label: '',
      labelMy: '',
      placeholder: '',
      placeholderMy: '',
      type: 'text',
      required: false,
      section: 'artist',
      order: 0,
    })
    setShowAddForm(false)

    toast({
      title: 'Field Added',
      description: 'New field added. Remember to save and create the database column.',
    })
  }

  const handleDeleteField = (id: string) => {
    if (confirm('Are you sure you want to delete this field? This cannot be undone.')) {
      setFields(fields.filter(f => f.id !== id))
    }
  }

  const handleToggleRequired = (id: string) => {
    setFields(fields.map(f => 
      f.id === id ? { ...f, required: !f.required } : f
    ))
  }

  const handleEditField = (field: FormField) => {
    setEditingField(field)
  }

  const handleSaveEdit = () => {
    if (!editingField) return
    
    setFields(fields.map(f => 
      f.id === editingField.id ? editingField : f
    ))
    setEditingField(null)
    
    toast({
      title: 'Field Updated',
      description: 'Field changes saved. Remember to save all changes.',
    })
  }

  const handleCancelEdit = () => {
    setEditingField(null)
  }

  const sections = ['artist', 'release', 'track'] as const

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Configure Fields</h3>
          <p className="text-sm text-muted-foreground">
            Fields marked as required will show an asterisk (*) in the form
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Field
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Field</CardTitle>
            <CardDescription>New fields will automatically create database columns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Field Name (database column)</Label>
                <Input
                  value={newField.name}
                  onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                  placeholder="e.g., producer_name"
                />
              </div>
              <div className="space-y-2">
                <Label>Field Label (English)</Label>
                <Input
                  value={newField.label}
                  onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                  placeholder="e.g., Producer Name"
                />
              </div>
              <div className="space-y-2">
                <Label>Field Label (Myanmar)</Label>
                <Input
                  value={newField.labelMy || ''}
                  onChange={(e) => setNewField({ ...newField, labelMy: e.target.value })}
                  placeholder="e.g., ထုတ်လုပ်သူ အမည်"
                  className="font-myanmar"
                />
                {newField.labelMy && (
                  <p className="text-xs text-muted-foreground font-myanmar">
                    Preview: {newField.labelMy}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Placeholder (English)</Label>
                <Input
                  value={newField.placeholder || ''}
                  onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
                  placeholder="e.g., Enter producer name"
                />
              </div>
              <div className="space-y-2">
                <Label>Placeholder (Myanmar)</Label>
                <Input
                  value={newField.placeholderMy || ''}
                  onChange={(e) => setNewField({ ...newField, placeholderMy: e.target.value })}
                  placeholder="e.g., ထုတ်လုပ်သူ အမည် ထည့်သွင်းရန်"
                  className="font-myanmar"
                />
                {newField.placeholderMy && (
                  <p className="text-xs text-muted-foreground font-myanmar">
                    Preview: {newField.placeholderMy}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Field Type</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newField.type}
                  onChange={(e) => setNewField({ ...newField, type: e.target.value as FormField['type'] })}
                >
                  <option value="text">Text</option>
                  <option value="email">Email</option>
                  <option value="tel">Phone</option>
                  <option value="date">Date</option>
                  <option value="select">Select/Dropdown</option>
                  <option value="textarea">Textarea</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newField.section}
                  onChange={(e) => setNewField({ ...newField, section: e.target.value as FormField['section'] })}
                >
                  <option value="artist">Artist Information</option>
                  <option value="release">Release Details</option>
                  <option value="track">Track/Song Details</option>
                </select>
              </div>
            </div>
            
            {/* Preview Section */}
            {(newField.label || newField.labelMy) && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                <Label className="text-sm font-semibold mb-2 block">Preview:</Label>
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">
                    {newField.label || 'Field Label'}
                  </Label>
                  {newField.labelMy && (
                    <p className="text-xs text-muted-foreground font-myanmar leading-tight">
                      {newField.labelMy}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Switch
                checked={newField.required}
                onCheckedChange={(checked) => setNewField({ ...newField, required: checked })}
              />
              <Label>Required Field</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddField}>Add Field</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {editingField && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Field: {editingField.name}</CardTitle>
            <CardDescription>Update field labels and translations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Field Label (English)</Label>
                <Input
                  value={editingField.label}
                  onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Field Label (Myanmar)</Label>
                <Input
                  value={editingField.labelMy || ''}
                  onChange={(e) => setEditingField({ ...editingField, labelMy: e.target.value })}
                  placeholder="e.g., အနုပညာရှင် အမည်"
                  className="font-myanmar"
                />
                {editingField.labelMy && (
                  <p className="text-xs text-muted-foreground font-myanmar">
                    Preview: {editingField.labelMy}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Placeholder (English)</Label>
                <Input
                  value={editingField.placeholder || ''}
                  onChange={(e) => setEditingField({ ...editingField, placeholder: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Placeholder (Myanmar)</Label>
                <Input
                  value={editingField.placeholderMy || ''}
                  onChange={(e) => setEditingField({ ...editingField, placeholderMy: e.target.value })}
                  placeholder="e.g., အနုပညာရှင် အမည် ထည့်သွင်းရန်"
                  className="font-myanmar"
                />
                {editingField.placeholderMy && (
                  <p className="text-xs text-muted-foreground font-myanmar">
                    Preview: {editingField.placeholderMy}
                  </p>
                )}
              </div>
            </div>
            
            {/* Preview Section */}
            {(editingField.label || editingField.labelMy) && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                <Label className="text-sm font-semibold mb-2 block">Preview:</Label>
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">
                    {editingField.label || 'Field Label'}
                  </Label>
                  {editingField.labelMy && (
                    <p className="text-xs text-muted-foreground font-myanmar leading-tight">
                      {editingField.labelMy}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Switch
                checked={editingField.required}
                onCheckedChange={(checked) => setEditingField({ ...editingField, required: checked })}
              />
              <Label>Required Field</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveEdit}>Save Changes</Button>
              <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {sections.map((section) => {
        const sectionFields = fields
          .filter(f => f.section === section)
          .sort((a, b) => a.order - b.order)

        return (
          <Card key={section}>
            <CardHeader>
              <CardTitle className="capitalize">
                {section === 'artist' ? 'Artist Information' : section === 'release' ? 'Release Details' : 'Track/Song Details'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field Name</TableHead>
                    <TableHead>Label (EN)</TableHead>
                    <TableHead>Label (Myanmar)</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectionFields.map((field) => (
                    <TableRow key={field.id}>
                      <TableCell className="font-mono text-sm">{field.name}</TableCell>
                      <TableCell>{field.label}</TableCell>
                      <TableCell className="font-myanmar">{field.labelMy || <span className="text-muted-foreground italic">Not set</span>}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{field.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={field.required}
                          onCheckedChange={() => handleToggleRequired(field.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditField(field)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteField(field.id)}
                            className="text-destructive h-8 w-8 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

