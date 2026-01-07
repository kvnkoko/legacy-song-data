'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, CheckCircle2, Moon, Sun } from 'lucide-react'
import { ArtistMultiSelect } from '@/components/artist-multi-select'
import { useToast } from '@/hooks/use-toast'
import { useTheme } from 'next-themes'

interface Song {
  name: string
  performer: string
  composer: string
  band: string
  musicProducer: string
  studio: string
  recordLabel: string
  genre: string
}

export default function SubmitPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [step, setStep] = useState(1)
  const [artistIds, setArtistIds] = useState<string[]>([]) // Array of artist IDs (first is primary)
  const [legalName, setLegalName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [releaseType, setReleaseType] = useState<'SINGLE' | 'ALBUM'>('SINGLE')
  const [releaseTitle, setReleaseTitle] = useState('')
  const [artistsChosenDate, setArtistsChosenDate] = useState('')
  const [songs, setSongs] = useState<Song[]>([
    { name: '', performer: '', composer: '', band: '', musicProducer: '', studio: '', recordLabel: '', genre: '' }
  ])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [language, setLanguage] = useState<'en' | 'my'>('my') // Default to Myanmar for clients
  const [formFields, setFormFields] = useState<any[]>([])
  const formRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to submit on review step
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && step === 4 && !loading) {
        handleSubmit()
        return
      }

      // Escape to go back
      if (e.key === 'Escape' && step > 1) {
        setStep(step - 1)
        return
      }

      // Tab navigation enhancement - skip disabled buttons
      if (e.key === 'Tab') {
        const focusableElements = document.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        const focusableArray = Array.from(focusableElements) as HTMLElement[]
        const currentIndex = focusableArray.indexOf(document.activeElement as HTMLElement)

        if (e.shiftKey) {
          // Shift + Tab
          if (currentIndex > 0) {
            e.preventDefault()
            focusableArray[currentIndex - 1]?.focus()
          }
        } else {
          // Tab
          if (currentIndex < focusableArray.length - 1) {
            e.preventDefault()
            focusableArray[currentIndex + 1]?.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [step, loading])

  // Load form fields with translations
  useEffect(() => {
    fetch('/api/admin/form-fields')
      .then(res => res.json())
      .then(data => {
        if (data.fields && data.fields.length > 0) {
          setFormFields(data.fields)
        }
      })
      .catch(() => {
        // Use defaults if API fails
      })
  }, [])

  // Autosave draft
  useEffect(() => {
    const timer = setTimeout(() => {
      if (artistIds.length > 0 || releaseTitle) {
        saveDraft()
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [artistIds, legalName, releaseType, releaseTitle, artistsChosenDate, songs])

  // Helper function to get field label (always English)
  const getFieldLabel = (fieldName: string, defaultLabel: string): string => {
    const field = formFields.find(f => f.name === fieldName)
    if (!field) return defaultLabel
    return field.label || defaultLabel
  }

  // Helper function to get Myanmar subtitle if available
  const getFieldSubtitle = (fieldName: string): string | null => {
    const field = formFields.find(f => f.name === fieldName)
    if (!field || !field.labelMy || field.labelMy.trim() === '') return null
    return field.labelMy
  }

  // Helper function to get field placeholder
  const getFieldPlaceholder = (fieldName: string, defaultPlaceholder: string): string => {
    const field = formFields.find(f => f.name === fieldName)
    if (!field) return defaultPlaceholder
    return field.placeholder || defaultPlaceholder
  }

  const saveDraft = async () => {
    setSaving(true)
    try {
      await fetch('/api/submissions/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistIds,
          legalName,
          releaseType,
          releaseTitle,
          artistsChosenDate,
          songs,
        }),
      })
    } catch (error) {
      console.error('Failed to save draft:', error)
    } finally {
      setSaving(false)
    }
  }

  const addSong = () => {
    if (releaseType === 'SINGLE' && songs.length >= 1) {
      return
    }
    setSongs([...songs, { name: '', performer: '', composer: '', band: '', musicProducer: '', studio: '', recordLabel: '', genre: '' }])
  }

  useEffect(() => {
    if (releaseType === 'SINGLE' && songs.length > 1) {
      setSongs([songs[0]])
    }
  }, [releaseType])

  const removeSong = (index: number) => {
    setSongs(songs.filter((_, i) => i !== index))
  }

  const updateSong = (index: number, field: keyof Song, value: string) => {
    const updated = [...songs]
    updated[index] = { ...updated[index], [field]: value }
    setSongs(updated)
  }

  const handleSubmit = async () => {
    const validSongs = songs.filter(s => s.name.trim() !== '')
    if (validSongs.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one song with a name.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistIds: artistIds, // Array of artist IDs (first is primary)
          legalName,
          contactEmail,
          contactPhone,
          releaseType,
          releaseTitle,
          artistsChosenDate: artistsChosenDate || null,
          songs: validSongs,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Success!",
          description: "Your release has been submitted successfully.",
        })
        router.push(`/status/${data.releaseId}`)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to submit release' }))
        console.error('Submission error:', errorData)
        toast({
          title: "Submission failed",
          description: errorData.error || "Failed to submit release. Please check the console for details.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error('Submission error:', error)
      toast({
        title: "Error",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-purple-lg border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
          <CardHeader className="border-b border-primary/20 pb-4 sm:pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                  Submit Release
                </CardTitle>
                <CardDescription className="mt-1 text-sm sm:text-base">
                  Fill out the form below to submit your music release
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                {saving && (
                  <Badge variant="purple" className="animate-pulse text-xs sm:text-sm">
                    {language === 'my' ? 'သိမ်းဆည်းနေသည်...' : 'Saving draft...'}
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="h-9 w-9 sm:h-10 sm:w-10 shrink-0"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-6">
            {/* Progress Steps - Fixed positioning */}
            <div className="relative mb-6 sm:mb-8 px-2 sm:px-4">
              <div className="relative flex justify-between items-start">
                {[1, 2, 3, 4].map((s) => (
                  <div key={s} className="flex flex-col items-center flex-1 relative z-10">
                    {/* Connecting line - positioned between circles */}
                    {s < 4 && (
                      <div
                        className={`absolute top-5 sm:top-6 left-1/2 h-0.5 sm:h-1 transition-all duration-300 ${
                          step > s ? 'bg-primary shadow-purple' : 'bg-muted'
                        }`}
                        style={{ 
                          width: 'calc(100% - 2.5rem)',
                          transform: 'translateX(50%)',
                          zIndex: 1
                        }}
                      />
                    )}
                    <div
                      className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-semibold text-sm sm:text-base transition-all duration-300 z-10 ${
                        step >= s 
                          ? 'bg-primary text-primary-foreground shadow-md shadow-purple scale-110' 
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {step > s ? <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" /> : s}
                    </div>
                    <div className={`text-xs sm:text-sm mt-2 text-center font-medium max-w-[60px] sm:max-w-none relative z-10 ${
                      step >= s ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {s === 1 && (language === 'my' ? 'အနုပညာရှင်' : 'Artist')}
                      {s === 2 && (language === 'my' ? 'ထုတ်ဝေမှု' : 'Release')}
                      {s === 3 && (language === 'my' ? 'တေးသီချင်းများ' : 'Songs')}
                      {s === 4 && (language === 'my' ? 'ပြန်လည် စစ်ဆေးရန်' : 'Review')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 sm:space-y-6"
                >
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">
                      {language === 'my' ? 'အနုပညာရှင် အချက်အလက်' : 'Artist Information'}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {language === 'my' ? 'ဤ ထုတ်ဝေမှု အတွက် အနုပညာရှင် အကြောင်း ပြောပြပါ' : 'Tell us about the artist for this release'}
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="space-y-0.5">
                        <Label htmlFor="artistName" className="text-sm font-medium">
                          {getFieldLabel('artistName', 'Artist Name')} <span className="text-destructive">*</span>
                        </Label>
                        {getFieldSubtitle('artistName') && (
                          <p className="text-xs text-muted-foreground font-myanmar leading-tight">
                            {getFieldSubtitle('artistName')}
                          </p>
                        )}
                      </div>
                      <ArtistMultiSelect
                        value={artistIds}
                        onChange={setArtistIds}
                        placeholder={getFieldPlaceholder('artistName', 'Search and select artists (first is primary)...')}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="space-y-0.5">
                        <Label htmlFor="legalName" className="text-sm font-medium">
                          {getFieldLabel('legalName', 'Legal Name')}
                        </Label>
                        {getFieldSubtitle('legalName') && (
                          <p className="text-xs text-muted-foreground font-myanmar leading-tight">
                            {getFieldSubtitle('legalName')}
                          </p>
                        )}
                      </div>
                      <Input
                        id="legalName"
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                        placeholder={getFieldPlaceholder('legalName', 'Enter legal name (optional)')}
                        className="h-11"
                        ref={(el) => formRefs.current['legalName'] = el}
                      />
                      <p className="text-xs text-muted-foreground">
                        {language === 'my' ? 'စာချုပ်များနှင့် ငွေပေးချေမှုများအတွက် အသုံးပြုသော တရားဝင် အမည်' : 'The legal name used for contracts and payments'}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="space-y-0.5">
                          <Label htmlFor="contactEmail" className="text-sm font-medium">
                            {getFieldLabel('contactEmail', 'Contact Email')}
                          </Label>
                          {getFieldSubtitle('contactEmail') && (
                            <p className="text-xs text-muted-foreground font-myanmar leading-tight">
                              {getFieldSubtitle('contactEmail')}
                            </p>
                          )}
                        </div>
                        <Input
                          id="contactEmail"
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder={getFieldPlaceholder('contactEmail', 'your@email.com (optional)')}
                          className="h-11"
                          ref={(el) => formRefs.current['contactEmail'] = el}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="space-y-0.5">
                          <Label htmlFor="contactPhone" className="text-sm font-medium">
                            {getFieldLabel('contactPhone', 'Contact Phone')}
                          </Label>
                          {getFieldSubtitle('contactPhone') && (
                            <p className="text-xs text-muted-foreground font-myanmar leading-tight">
                              {getFieldSubtitle('contactPhone')}
                            </p>
                          )}
                        </div>
                        <Input
                          id="contactPhone"
                          type="tel"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder={getFieldPlaceholder('contactPhone', '+1 234 567 8900 (optional)')}
                          className="h-11"
                          ref={(el) => formRefs.current['contactPhone'] = el}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4 border-t gap-3">
                    <Button 
                      onClick={() => setStep(2)} 
                      disabled={artistIds.length === 0} 
                      size="lg"
                      className="min-w-[100px] sm:min-w-[120px]"
                    >
                      {language === 'my' ? 'ရှေ့သို့' : 'Continue'}
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 sm:space-y-6"
                >
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">
                      {language === 'my' ? 'ထုတ်ဝေမှု အသေးစိတ်' : 'Release Details'}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {language === 'my' ? 'သင်၏ ထုတ်ဝေမှု အကြောင်း အချက်အလက်' : 'Information about your release'}
                    </p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">
                          {getFieldLabel('releaseType', 'Release Type')} <span className="text-destructive">*</span>
                        </Label>
                        {getFieldSubtitle('releaseType') && (
                          <p className="text-xs text-muted-foreground font-myanmar leading-tight">
                            {getFieldSubtitle('releaseType')}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant={releaseType === 'SINGLE' ? 'default' : 'outline'}
                          onClick={() => setReleaseType('SINGLE')}
                          className="flex-1 h-12 text-sm sm:text-base"
                        >
                          {language === 'my' ? 'Single' : 'Single'}
                        </Button>
                        <Button
                          type="button"
                          variant={releaseType === 'ALBUM' ? 'default' : 'outline'}
                          onClick={() => setReleaseType('ALBUM')}
                          className="flex-1 h-12 text-sm sm:text-base"
                        >
                          {language === 'my' ? 'Album' : 'Album'}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="space-y-0.5">
                        <Label htmlFor="releaseTitle" className="text-sm font-medium">
                          {getFieldLabel('releaseTitle', 'Release Title')} <span className="text-destructive">*</span>
                        </Label>
                        {getFieldSubtitle('releaseTitle') && (
                          <p className="text-xs text-muted-foreground font-myanmar leading-tight">
                            {getFieldSubtitle('releaseTitle')}
                          </p>
                        )}
                      </div>
                      <Input
                        id="releaseTitle"
                        value={releaseTitle}
                        onChange={(e) => setReleaseTitle(e.target.value)}
                        placeholder={getFieldPlaceholder('releaseTitle', 'Enter release title')}
                        required
                        className="h-11"
                        ref={(el) => formRefs.current['releaseTitle'] = el}
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="space-y-0.5">
                        <Label htmlFor="artistsChosenDate" className="text-sm font-medium">
                          {getFieldLabel('artistsChosenDate', "Artist's Chosen Date")}
                        </Label>
                        {getFieldSubtitle('artistsChosenDate') && (
                          <p className="text-xs text-muted-foreground font-myanmar leading-tight">
                            {getFieldSubtitle('artistsChosenDate')}
                          </p>
                        )}
                      </div>
                      <Input
                        id="artistsChosenDate"
                        type="date"
                        value={artistsChosenDate}
                        onChange={(e) => setArtistsChosenDate(e.target.value)}
                        className="h-11"
                        ref={(el) => formRefs.current['artistsChosenDate'] = el}
                      />
                      <p className="text-xs text-muted-foreground">
                        {language === 'my' ? 'သင်နှစ်သက်သော ထုတ်ဝေမှု ရက်စွဲ' : 'Your preferred release date'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      onClick={() => setStep(1)}
                      className="w-full sm:w-auto"
                    >
                      {language === 'my' ? 'နောက်သို့' : 'Back'}
                    </Button>
                    <Button 
                      onClick={() => setStep(3)} 
                      disabled={!releaseTitle.trim()} 
                      size="lg"
                      className="w-full sm:w-auto min-w-[100px] sm:min-w-[120px]"
                    >
                      {language === 'my' ? 'ရှေ့သို့' : 'Continue'}
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 sm:space-y-6"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <div>
                      <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">
                        {language === 'my' ? 'တေးသီချင်းများ' : 'Songs'}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {language === 'my' ? 'ဤ ထုတ်ဝေမှု အတွက် တေးသီချင်းများ ထည့်သွင်းရန်' : 'Add all songs for this release'}
                      </p>
                    </div>
                    {releaseType === 'ALBUM' && (
                      <Button onClick={addSong} size="sm" className="gap-2 w-full sm:w-auto">
                        <Plus className="w-4 h-4" />
                        {language === 'my' ? 'တေးသီချင်း ထည့်ရန်' : 'Add Song'}
                      </Button>
                    )}
                    {releaseType === 'SINGLE' && (
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {language === 'my' ? 'Single များတွင် တေးသီချင်း တစ်ပုဒ်သာ ရှိနိုင်သည်' : 'Singles can only have one song'}
                      </p>
                    )}
                  </div>
                  <div className="space-y-4">
                    {songs.map((song, index) => (
                      <Card key={index} className="border-2">
                        <CardContent className="pt-4 sm:pt-6">
                          <div className="flex justify-between items-center mb-4 pb-4 border-b">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                                {index + 1}
                              </div>
                              <h4 className="font-semibold text-sm sm:text-base">Song {index + 1}</h4>
                            </div>
                            {songs.length > 1 && releaseType === 'ALBUM' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeSong(index)}
                                className="text-destructive hover:text-destructive h-8 w-8 sm:h-9 sm:w-9"
                                aria-label={`Remove song ${index + 1}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2 sm:col-span-2">
                              <div className="space-y-0.5">
                                <Label className="text-sm font-medium">
                                  {getFieldLabel('songName', 'Song Name')} <span className="text-destructive">*</span>
                                </Label>
                                {getFieldSubtitle('songName') && (
                                  <p className="text-xs text-muted-foreground font-myanmar leading-tight">
                                    {getFieldSubtitle('songName')}
                                  </p>
                                )}
                              </div>
                              <Input
                                value={song.name}
                                onChange={(e) => updateSong(index, 'name', e.target.value)}
                                placeholder={getFieldPlaceholder('songName', 'Enter song name')}
                                required
                                className="h-11"
                                autoFocus={index === 0 && songs.length === 1}
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="space-y-0.5">
                                <Label className="text-sm font-medium">{getFieldLabel('performer', 'Artist')}</Label>
                                {getFieldSubtitle('performer') && (
                                  <p className="text-xs text-muted-foreground font-myanmar leading-tight">
                                    {getFieldSubtitle('performer')}
                                  </p>
                                )}
                              </div>
                              <Input
                                value={song.performer}
                                onChange={(e) => updateSong(index, 'performer', e.target.value)}
                                placeholder={getFieldPlaceholder('performer', 'Enter performer')}
                                className="h-11"
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="space-y-0.5">
                                <Label className="text-sm font-medium">{getFieldLabel('composer', 'Composer')}</Label>
                                {getFieldSubtitle('composer') && (
                                  <p className="text-xs text-muted-foreground font-myanmar leading-tight">
                                    {getFieldSubtitle('composer')}
                                  </p>
                                )}
                              </div>
                              <Input
                                value={song.composer}
                                onChange={(e) => updateSong(index, 'composer', e.target.value)}
                                placeholder={getFieldPlaceholder('composer', 'Enter composer')}
                                className="h-11"
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="space-y-0.5">
                                <Label className="text-sm font-medium">{getFieldLabel('band', 'Band')}</Label>
                                {getFieldSubtitle('band') && (
                                  <p className="text-xs text-muted-foreground font-myanmar leading-tight">
                                    {getFieldSubtitle('band')}
                                  </p>
                                )}
                              </div>
                              <Input
                                value={song.band}
                                onChange={(e) => updateSong(index, 'band', e.target.value)}
                                placeholder={getFieldPlaceholder('band', 'Enter band')}
                                className="h-11"
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="space-y-0.5">
                                <Label className="text-sm font-medium">{getFieldLabel('musicProducer', 'Music Producer')}</Label>
                                {getFieldSubtitle('musicProducer') && (
                                  <p className="text-xs text-muted-foreground font-myanmar leading-tight">
                                    {getFieldSubtitle('musicProducer')}
                                  </p>
                                )}
                              </div>
                              <Input
                                value={song.musicProducer}
                                onChange={(e) => updateSong(index, 'musicProducer', e.target.value)}
                                placeholder={getFieldPlaceholder('musicProducer', 'Enter music producer')}
                                className="h-11"
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="space-y-0.5">
                                <Label className="text-sm font-medium">{getFieldLabel('studio', 'Studio')}</Label>
                                {getFieldSubtitle('studio') && (
                                  <p className="text-xs text-muted-foreground font-myanmar leading-tight">
                                    {getFieldSubtitle('studio')}
                                  </p>
                                )}
                              </div>
                              <Input
                                value={song.studio}
                                onChange={(e) => updateSong(index, 'studio', e.target.value)}
                                placeholder={getFieldPlaceholder('studio', 'Enter studio')}
                                className="h-11"
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="space-y-0.5">
                                <Label className="text-sm font-medium">{getFieldLabel('recordLabel', 'Record Label')}</Label>
                                {getFieldSubtitle('recordLabel') && (
                                  <p className="text-xs text-muted-foreground font-myanmar leading-tight">
                                    {getFieldSubtitle('recordLabel')}
                                  </p>
                                )}
                              </div>
                              <Input
                                value={song.recordLabel}
                                onChange={(e) => updateSong(index, 'recordLabel', e.target.value)}
                                placeholder={getFieldPlaceholder('recordLabel', 'Enter record label')}
                                className="h-11"
                              />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                              <div className="space-y-0.5">
                                <Label className="text-sm font-medium">{getFieldLabel('genre', 'Genre')}</Label>
                                {getFieldSubtitle('genre') && (
                                  <p className="text-xs text-muted-foreground font-myanmar leading-tight">
                                    {getFieldSubtitle('genre')}
                                  </p>
                                )}
                              </div>
                              <Input
                                value={song.genre}
                                onChange={(e) => updateSong(index, 'genre', e.target.value)}
                                placeholder={getFieldPlaceholder('genre', 'Enter genre')}
                                className="h-11"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      onClick={() => setStep(2)}
                      className="w-full sm:w-auto"
                    >
                      {language === 'my' ? 'နောက်သို့' : 'Back'}
                    </Button>
                    <Button 
                      onClick={() => setStep(4)} 
                      size="lg"
                      className="w-full sm:w-auto min-w-[100px] sm:min-w-[120px]"
                    >
                      {language === 'my' ? 'ရှေ့သို့' : 'Continue'}
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 sm:space-y-6"
                >
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">
                      {language === 'my' ? 'ပြန်လည် စစ်ဆေးရန်နှင့် တင်သွင်းရန်' : 'Review & Submit'}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {language === 'my' 
                        ? 'တင်သွင်းမီ အားလုံး အချက်အလက်များကို ပြန်လည် စစ်ဆေးပါ။ တင်သွင်းရန် Ctrl/Cmd + Enter နှိပ်ပါ။' 
                        : 'Please review all information before submitting. Press Ctrl/Cmd + Enter to submit.'}
                    </p>
                  </div>
                  <Card className="border-2">
                    <CardContent className="pt-4 sm:pt-6 space-y-4 sm:space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">Artist</div>
                          <div className="font-medium text-sm sm:text-base">{artistName}</div>
                          {legalName && (
                            <div className="text-xs sm:text-sm text-muted-foreground mt-1">Legal: {legalName}</div>
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">Release Type</div>
                          <Badge variant="outline" className="text-xs sm:text-sm">{releaseType}</Badge>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">Release Title</div>
                          <div className="font-medium text-sm sm:text-base">{releaseTitle}</div>
                        </div>
                        {artistsChosenDate && (
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">Artist's Chosen Date</div>
                            <div className="font-medium text-sm sm:text-base">{new Date(artistsChosenDate).toLocaleDateString()}</div>
                          </div>
                        )}
                      </div>
                      <div className="pt-4 border-t">
                        <div className="text-xs font-medium text-muted-foreground mb-3">
                          Songs ({songs.filter(s => s.name).length})
                        </div>
                        <div className="space-y-2">
                          {songs.filter(s => s.name).map((song, i) => (
                            <div key={i} className="p-3 border rounded-lg bg-muted/30">
                              <div className="font-medium text-sm sm:text-base">{i + 1}. {song.name}</div>
                              {(song.performer || song.composer || song.genre) && (
                                <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                                  {song.performer && `Performer: ${song.performer}`}
                                  {song.performer && song.composer && ' • '}
                                  {song.composer && `Composer: ${song.composer}`}
                                  {song.genre && ` • Genre: ${song.genre}`}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      onClick={() => setStep(3)}
                      className="w-full sm:w-auto"
                    >
                      {language === 'my' ? 'နောက်သို့' : 'Back'}
                    </Button>
                    <Button 
                      onClick={handleSubmit} 
                      disabled={loading} 
                      size="lg" 
                      className="w-full sm:w-auto min-w-[140px] sm:min-w-[160px]"
                    >
                      {loading 
                        ? (language === 'my' ? 'တင်သွင်းနေသည်...' : 'Submitting...') 
                        : (language === 'my' ? 'ထုတ်ဝေမှု တင်သွင်းရန်' : 'Submit Release')}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
