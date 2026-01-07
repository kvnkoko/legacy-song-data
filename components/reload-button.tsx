'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface ReloadButtonProps {
  label?: string
}

export function ReloadButton({ label = 'Reload Page' }: ReloadButtonProps) {
  const router = useRouter()
  
  return (
    <Button
      variant="outline"
      onClick={() => router.refresh()}
    >
      {label}
    </Button>
  )
}

