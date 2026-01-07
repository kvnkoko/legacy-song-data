'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface UserDeleteButtonProps {
  userId: string
  currentUserId: string
}

const STORAGE_KEY = 'user-delete-skip-confirmation'

export function UserDeleteButton({ userId, currentUserId }: UserDeleteButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [skipConfirmation, setSkipConfirmation] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Load preference from localStorage on mount
  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'true') {
        setSkipConfirmation(true)
      }
    } catch (error) {
      // localStorage might not be available
      console.warn('Failed to load delete confirmation preference:', error)
    }
  }, [])

  if (userId === currentUserId) {
    return null // Don't show delete button for current user
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${userId}/delete`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete user')
      }

      setOpen(false)
      router.refresh()
      toast({
        title: 'User deleted',
        description: 'The user has been successfully deleted.',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (skipConfirmation) {
      // Delete immediately if confirmation is skipped
      handleDelete()
    } else {
      // Show dialog
      setOpen(true)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    // Prevent opening if skipConfirmation is enabled
    if (newOpen && skipConfirmation) {
      return
    }
    setOpen(newOpen)
  }

  const handleSkipConfirmationChange = (checked: boolean | string) => {
    const isChecked = checked === true || checked === 'checked'
    setSkipConfirmation(isChecked)
    try {
      localStorage.setItem(STORAGE_KEY, isChecked.toString())
    } catch (error) {
      console.warn('Failed to save delete confirmation preference:', error)
    }
  }

  // Always render the same structure to prevent animation glitches
  // Use controlled open state instead of conditional rendering
  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          disabled={loading}
          onClick={handleTriggerClick}
          type="button"
        >
          {loading ? 'Deleting...' : 'Delete'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete User</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this user? This action cannot be undone.
            All associated data will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {mounted && (
          <div className="flex items-center space-x-2 py-4">
            <Checkbox
              id={`skip-confirmation-${userId}`}
              checked={skipConfirmation}
              onCheckedChange={handleSkipConfirmationChange}
            />
            <Label
              htmlFor={`skip-confirmation-${userId}`}
              className="text-sm font-normal cursor-pointer"
            >
              Do not show this again
            </Label>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} onClick={() => setOpen(false)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}




