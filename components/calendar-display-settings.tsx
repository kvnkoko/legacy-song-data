'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Settings2, Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface CalendarDisplaySettingsProps {
  dateField: 'legacyReleaseDate' | 'artistsChosenDate'
  onDateFieldChange: (field: 'legacyReleaseDate' | 'artistsChosenDate') => void
  displayFields: {
    showTitle: boolean
    showArtist: boolean
    showType: boolean
    showTrackCount: boolean
    showPlatformStatus: boolean
    showArtistsDate: boolean
    showCopyright: boolean
  }
  onDisplayFieldsChange: (fields: CalendarDisplaySettingsProps['displayFields']) => void
}

export function CalendarDisplaySettings({
  dateField,
  onDateFieldChange,
  displayFields,
  onDisplayFieldsChange,
}: CalendarDisplaySettingsProps) {
  const [localFields, setLocalFields] = useState(displayFields)
  const [localDateField, setLocalDateField] = useState(dateField)
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setLocalFields(displayFields)
    setLocalDateField(dateField)
  }, [displayFields, dateField])

  const handleSave = async () => {
    onDateFieldChange(localDateField)
    onDisplayFieldsChange(localFields)
    
    // Save to user preferences
    try {
      const response = await fetch('/api/users/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: {
            calendar: {
              dateField: localDateField,
              displayFields: localFields,
            },
          },
        }),
      })

      if (response.ok) {
        toast({
          title: 'Settings saved',
          description: 'Your calendar display preferences have been saved.',
        })
        setIsOpen(false)
      }
    } catch (error) {
      console.error('Failed to save preferences:', error)
      toast({
        title: 'Settings saved locally',
        description: 'Preferences saved but may not persist across sessions.',
      })
      setIsOpen(false)
    }
  }

  const toggleField = (field: keyof typeof localFields) => {
    setLocalFields(prev => ({
      ...prev,
      [field]: !prev[field],
    }))
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 font-semibold hover:bg-primary/10 hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md">
          <Settings2 className="w-4 h-4" />
          Display Settings
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 shadow-xl border-border/50" align="end">
        <div className="space-y-5 p-4">
          <div>
            <h3 className="font-bold text-base tracking-tight mb-5">Calendar Display Settings</h3>
            
            {/* Date Field Selection */}
            <div className="space-y-3.5">
              <Label className="text-sm font-semibold tracking-tight block mb-2.5">Date Field</Label>
              <RadioGroup
                value={localDateField}
                onValueChange={(value) => setLocalDateField(value as 'legacyReleaseDate' | 'artistsChosenDate')}
                className="space-y-2.5"
              >
                <div className="flex items-center space-x-3 py-1.5">
                  <RadioGroupItem value="legacyReleaseDate" id="legacy" />
                  <Label htmlFor="legacy" className="font-medium cursor-pointer text-sm leading-relaxed pl-1">
                    Legacy Release Date
                  </Label>
                </div>
                <div className="flex items-center space-x-3 py-1.5">
                  <RadioGroupItem value="artistsChosenDate" id="artists" />
                  <Label htmlFor="artists" className="font-medium cursor-pointer text-sm leading-relaxed pl-1">
                    Artist's Chosen Date
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator className="my-4" />

            {/* Display Fields */}
            <div className="space-y-3.5">
              <Label className="text-sm font-semibold tracking-tight block mb-2.5">Show in Release Cards</Label>
              <div className="space-y-2.5">
                <div className="flex items-center space-x-3 py-1.5">
                  <Checkbox
                    id="showTitle"
                    checked={localFields.showTitle}
                    onCheckedChange={() => toggleField('showTitle')}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label htmlFor="showTitle" className="font-medium cursor-pointer text-sm leading-relaxed pl-1">
                    Title
                  </Label>
                </div>
                <div className="flex items-center space-x-3 py-1.5">
                  <Checkbox
                    id="showArtist"
                    checked={localFields.showArtist}
                    onCheckedChange={() => toggleField('showArtist')}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label htmlFor="showArtist" className="font-medium cursor-pointer text-sm leading-relaxed pl-1">
                    Artist Name
                  </Label>
                </div>
                <div className="flex items-center space-x-3 py-1.5">
                  <Checkbox
                    id="showType"
                    checked={localFields.showType}
                    onCheckedChange={() => toggleField('showType')}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label htmlFor="showType" className="font-medium cursor-pointer text-sm leading-relaxed pl-1">
                    Type (SINGLE/ALBUM)
                  </Label>
                </div>
                <div className="flex items-center space-x-3 py-1.5">
                  <Checkbox
                    id="showTrackCount"
                    checked={localFields.showTrackCount}
                    onCheckedChange={() => toggleField('showTrackCount')}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label htmlFor="showTrackCount" className="font-medium cursor-pointer text-sm leading-relaxed pl-1">
                    Track Count
                  </Label>
                </div>
                <div className="flex items-center space-x-3 py-1.5">
                  <Checkbox
                    id="showPlatformStatus"
                    checked={localFields.showPlatformStatus}
                    onCheckedChange={() => toggleField('showPlatformStatus')}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label htmlFor="showPlatformStatus" className="font-medium cursor-pointer text-sm leading-relaxed pl-1">
                    Platform Status
                  </Label>
                </div>
                <div className="flex items-center space-x-3 py-1.5">
                  <Checkbox
                    id="showArtistsDate"
                    checked={localFields.showArtistsDate}
                    onCheckedChange={() => toggleField('showArtistsDate')}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label htmlFor="showArtistsDate" className="font-medium cursor-pointer text-sm leading-relaxed pl-1">
                    Artist's Date
                  </Label>
                </div>
                <div className="flex items-center space-x-3 py-1.5">
                  <Checkbox
                    id="showCopyright"
                    checked={localFields.showCopyright}
                    onCheckedChange={() => toggleField('showCopyright')}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label htmlFor="showCopyright" className="font-medium cursor-pointer text-sm leading-relaxed pl-1">
                    Copyright Status
                  </Label>
                </div>
              </div>
            </div>

            <Separator className="my-5" />

            <Button onClick={handleSave} className="w-full gap-2 font-semibold h-10 shadow-sm hover:shadow-md transition-all duration-300">
              <Save className="w-4 h-4" />
              Save Settings
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

