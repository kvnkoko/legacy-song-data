'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Upload, X, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getPublicUrl } from '@/lib/storage'

interface EmployeePhotoUploadProps {
  employeeId: string
  currentPhoto?: string | null
  canEdit: boolean
}

export function EmployeePhotoUpload({ employeeId, currentPhoto, canEdit }: EmployeePhotoUploadProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please select an image file',
        variant: 'destructive',
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Image must be less than 5MB',
        variant: 'destructive',
      })
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('photo', file)

      const response = await fetch(`/api/employees/${employeeId}/photo`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload photo')
      }

      toast({
        title: 'Success',
        description: 'Photo uploaded successfully',
      })

      setPreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload photo',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleCancel = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const displayPhoto = preview || (currentPhoto ? getPublicUrl(currentPhoto) : null)

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        {displayPhoto ? (
          <div className="relative h-32 w-32 rounded-full overflow-hidden border-4 border-background shadow-lg">
            <img
              src={displayPhoto}
              alt="Employee photo"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="h-32 w-32 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-4xl font-bold text-primary-foreground shadow-lg">
            ?
          </div>
        )}
      </div>

      {canEdit && (
        <div className="flex flex-col items-center space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="photo-upload"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {preview ? 'Change Photo' : 'Upload Photo'}
            </Button>
            {preview && (
              <>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={uploading}
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            JPG, PNG or GIF. Max 5MB
          </p>
        </div>
      )}
    </div>
  )
}

