'use client'

import { useRouter } from 'next/navigation'
import { Pagination } from '@/components/ui/pagination'

interface ArtistsPageClientProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  searchParams: {
    search?: string
    letter?: string
    page?: string
    pageSize?: string
  }
}

export function ArtistsPageClient({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  searchParams,
}: ArtistsPageClientProps) {
  const router = useRouter()

  const updateSearchParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams()
    
    // Preserve existing params
    if (searchParams.search) params.set('search', searchParams.search)
    if (searchParams.letter) params.set('letter', searchParams.letter)
    
    // Apply updates
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })

    router.push(`/artists?${params.toString()}`)
  }

  return (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalItems}
      pageSize={pageSize}
      onPageChange={(page) => {
        updateSearchParams({ page: page.toString() })
      }}
      onPageSizeChange={(newPageSize) => {
        if (newPageSize === 24) {
          updateSearchParams({ pageSize: undefined, page: '1' })
        } else {
          updateSearchParams({ pageSize: newPageSize.toString(), page: '1' })
        }
      }}
      pageSizeOptions={[12, 24, 48, 96]}
      showPageSizeSelector={true}
      showJumpToPage={totalPages > 10}
    />
  )
}
