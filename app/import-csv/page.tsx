'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Upload, AlertCircle, FileSpreadsheet, Settings2, Pause, Play } from 'lucide-react'
import { FailedRowsReview } from '@/components/failed-rows-review'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ColumnMapping } from '@/lib/csv-importer'

// Available target fields
const SUBMISSION_FIELDS = [
  { value: 'submissionId', label: 'Submission ID' },
  { value: 'respondentId', label: 'Respondent ID' },
  { value: 'submittedAt', label: 'Submitted At' },
  { value: 'createdTime', label: 'Created Time' },
  { value: 'createdBy', label: 'Created By' },
  { value: 'artistName', label: 'Artist Name' },
  { value: 'legalName', label: 'Legal Name' },
  { value: 'signature', label: 'Signature' },
  { value: 'royaltyReceiveMethod', label: 'Royalty Receive Method' },
  { value: 'paymentRemarks', label: 'Payment Remarks' },
  { value: 'notes', label: 'Notes' },
  { value: 'releaseType', label: 'Release Type' },
  { value: 'releaseTitle', label: 'Release Title' },
  { value: 'albumId', label: 'Album ID' },
  { value: 'releasedDate', label: 'Released Date' },
  { value: 'legacyReleaseDate', label: 'Legacy Release Date' },
  { value: 'larsReleasedDate', label: "LARS Released Date" },
  { value: 'artistsChosenDate', label: "Artist's Chosen Date" },
  { value: 'assignedAR', label: 'Assigned A&R' },
  { value: 'fb', label: 'Facebook Status' },
  { value: 'fbRequest', label: 'Facebook Request' },
  { value: 'flow', label: 'Flow Status' },
  { value: 'flowRequest', label: 'Flow Request' },
  { value: 'tiktok', label: 'TikTok Status' },
  { value: 'tiktokRequest', label: 'TikTok Request' },
  { value: 'youtube', label: 'YouTube Status' },
  { value: 'youtubeRequest', label: 'YouTube Request' },
  { value: 'youtubeRemarks', label: 'YouTube Remarks' },
  { value: 'intlStreaming', label: 'International Streaming Status' },
  { value: 'intlStreamingRequest', label: 'International Streaming Request' },
  { value: 'ringtunes', label: 'Ringtunes Status' },
  { value: 'ringtunesRequest', label: 'Ringtunes Request' },
  { value: 'vuclip', label: 'Vuclip' },
  { value: 'filezilla', label: 'FileZilla' },
  { value: 'uploadStatus', label: 'Upload Status' },
  { value: 'fullyUploaded', label: 'Fully Uploaded' },
  { value: 'permitStatus', label: 'Permit Status' },
  { value: 'copyrightStatus', label: 'Copyright Status' },
  { value: 'videoType', label: 'Video Type' },
  { value: 'done', label: 'Done' },
  { value: 'moreTracks', label: 'More Tracks' },
]

const SONG_FIELDS = [
  { value: 'name', label: 'Song Name' },
  { value: 'artistName', label: 'Artist Name' },
  { value: 'bandName', label: 'Band Name' },
  { value: 'composerName', label: 'Composer Name' },
  { value: 'recordLabelName', label: 'Record Label Name' },
  { value: 'studioName', label: 'Studio Name' },
  { value: 'genre', label: 'Genre' },
  { value: 'producerArchived', label: 'Producer (Archived)' },
  { value: 'performerName', label: 'Artist Name' },
]

export default function ImportCSVPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any>(null)
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showMapping, setShowMapping] = useState(false)
  const [importProgress, setImportProgress] = useState<{
    sessionId: string | null
    totalRows: number
    rowsProcessed: number
    percentage: number
    status: string
  } | null>(null)
  const [showFailedRows, setShowFailedRows] = useState(false)
  const [importStats, setImportStats] = useState<{
    totalFailed: number
    estimatedSuccess: number
    actualSuccessCount: number
    actualErrorCount: number
    successRate: string
    errorCounts: Record<string, number>
    sampleErrors: Array<{ row: number; message: string }>
  } | null>(null)
  const [pollingActive, setPollingActive] = useState(false)
  const pollingActiveRef = useRef(false)
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Sync ref with state
  useEffect(() => {
    pollingActiveRef.current = pollingActive
  }, [pollingActive])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      pollingActiveRef.current = false
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current)
      }
    }
  }, [])

  // Check for active import session on mount
  useEffect(() => {
    // Check if there's an active import session
    const checkActiveImport = async () => {
      try {
        const response = await fetch('/api/import/csv/session?status=in_progress')
        if (response.ok) {
          const data = await response.json()
          if (data.session && data.session.status === 'in_progress') {
            // Resume existing import
            setImportProgress({
              sessionId: data.session.id,
              totalRows: data.session.totalRows,
              rowsProcessed: data.session.rowsProcessed,
              percentage: data.session.totalRows > 0 
                ? Math.round((data.session.rowsProcessed / data.session.totalRows) * 100) 
                : 0,
              status: data.session.status,
            })
            
            // Start polling
            setPollingActive(true)
            pollingActiveRef.current = true
            
            const pollProgress = async () => {
              // Check if polling should continue
              if (!pollingActiveRef.current) {
                return
              }
              
              try {
                const progressResponse = await fetch(
                  `/api/import/csv/progress-simple?sessionId=${data.session.id}`
                )
                if (progressResponse.ok) {
                  const progressData = await progressResponse.json()
                  
                  // Stop polling if session was cancelled
                  if (progressData.status === 'cancelled') {
                    setLoading(false)
                    setPollingActive(false)
                    pollingActiveRef.current = false
                    setError('Import was cancelled')
                    setImportProgress(null)
                    return
                  }
                  
                  // Update progress state
                  try {
                    setImportProgress({
                      sessionId: data.session.id,
                      totalRows: progressData.totalRows || data.session.totalRows,
                      rowsProcessed: progressData.rowsProcessed || 0,
                      percentage: progressData.percentage || 0,
                      status: progressData.status || 'in_progress',
                    })
                  } catch (stateError) {
                    console.error('Error updating import progress state:', stateError)
                  }
                  
                  if (progressData.status === 'completed') {
                    setLoading(false)
                    setPollingActive(false)
                    pollingActiveRef.current = false
                    // Check for failed rows
                    try {
                      const failedRowsResponse = await fetch(
                        `/api/import/csv/failed-rows?sessionId=${data.session.id}`
                      )
                      if (failedRowsResponse.ok) {
                        const failedData = await failedRowsResponse.json()
                        if (failedData.failedRows && failedData.failedRows.length > 0) {
                          setShowFailedRows(true)
                          setImportProgress((prev) => prev ? {
                            ...prev,
                            ...progressData,
                            status: 'completed_with_errors',
                          } : null)
                        } else {
                          alert(`Import completed!\n\nProcessed: ${progressData.rowsProcessed} rows`)
                          try {
                            router.push('/releases')
                          } catch (routerError) {
                            window.location.href = '/releases'
                          }
                        }
                      }
                    } catch (fetchError) {
                      console.error('Error checking failed rows:', fetchError)
                      alert(`Import completed!\n\nProcessed: ${progressData.rowsProcessed} rows`)
                      try {
                        router.push('/releases')
                      } catch (routerError) {
                        window.location.href = '/releases'
                      }
                    }
                  } else if (progressData.status === 'failed') {
                    setLoading(false)
                    setPollingActive(false)
                    pollingActiveRef.current = false
                    setError(progressData.error || 'Import failed')
                    setImportProgress(null)
                  } else if (progressData.status === 'in_progress' && pollingActiveRef.current) {
                    pollingTimeoutRef.current = setTimeout(pollProgress, 1000)
                  }
                }
              } catch (err) {
                // Continue polling on error - import continues in background
                console.warn('Progress polling error (import continues):', err)
                if (pollingActiveRef.current) {
                  pollingTimeoutRef.current = setTimeout(pollProgress, 2000)
                }
              }
            }
            
            // Start polling after a short delay
            pollingTimeoutRef.current = setTimeout(pollProgress, 500)
          }
        }
      } catch (e) {
        // Ignore errors - import may continue in background
        console.warn('Error checking active import (import may continue in background):', e)
      }
    }
    
    checkActiveImport()
    
    // Clear all browser storage on mount
    const clearImportCache = () => {
      try {
        // Clear localStorage
        const localStorageKeys = [
          'csv-import-file',
          'csv-import-preview',
          'csv-import-mappings',
          'csv-import-progress',
        ]
        localStorageKeys.forEach(key => {
          localStorage.removeItem(key)
        })
        
        // Clear sessionStorage
        const sessionStorageKeys = [
          'csv-import-file',
          'csv-import-preview',
          'csv-import-mappings',
          'csv-import-progress',
        ]
        sessionStorageKeys.forEach(key => {
          sessionStorage.removeItem(key)
        })
        
        // Clear any other import-related cache
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('csv-import') || key.startsWith('import-')) {
            localStorage.removeItem(key)
          }
        })
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('csv-import') || key.startsWith('import-')) {
            sessionStorage.removeItem(key)
          }
        })
      } catch (e) {
        // Ignore storage errors
        console.warn('Failed to clear cache:', e)
      }
    }
    
    clearImportCache()
  }, [])

  const extractSongIndex = (columnName: string): number | null => {
    const match = columnName.match(/^song\s*(\d+)/i)
    return match ? parseInt(match[1], 10) : null
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Clear all cached data when selecting a new file
    try {
      localStorage.removeItem('csv-import-file')
      localStorage.removeItem('csv-import-preview')
      localStorage.removeItem('csv-import-mappings')
      localStorage.removeItem('csv-import-progress')
      sessionStorage.removeItem('csv-import-file')
      sessionStorage.removeItem('csv-import-preview')
      sessionStorage.removeItem('csv-import-mappings')
      sessionStorage.removeItem('csv-import-progress')
    } catch (e) {
      // Ignore storage errors
    }

    setFile(selectedFile)
    setError('')
    setPreview(null)
    setMappings([])
    setShowMapping(false)
    setImportProgress(null) // Clear any previous import progress

    try {
      const text = await selectedFile.text()
      const response = await fetch('/api/import/csv/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to preview CSV')
      }

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = 'Failed to preview CSV'
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setPreview(data)
      // Initialize mappings from auto-detected ones
      if (data.mappingConfig?.columns) {
        // Ensure song indices are properly set for song columns
        const initializedMappings = data.mappingConfig.columns.map((mapping: ColumnMapping) => {
          if (mapping.fieldType === 'song' && !mapping.songIndex) {
            const songIndex = extractSongIndex(mapping.csvColumn)
            return { ...mapping, songIndex: songIndex || 1 }
          }
          return mapping
        })
        setMappings(initializedMappings)
        // Auto-show mapping if there are columns to map
        if (initializedMappings.length > 0) {
          setShowMapping(true)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to parse CSV file')
      setPreview(null)
    }
  }

  const updateMapping = (index: number, updates: Partial<ColumnMapping>) => {
    const newMappings = [...mappings]
    newMappings[index] = { ...newMappings[index], ...updates }
    setMappings(newMappings)
  }

  const handleImport = async () => {
    if (!file) return

    setLoading(true)
    setError('')

    try {
      const content = await file.text()
      
      // Build mapping config from current mappings
      const mappingConfig = {
        columns: mappings,
        songPatterns: {} as any,
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'import-csv/page.tsx:290',message:'Mapping config before send',data:{mappingsCount:mappings.length,releaseTitleMapping:mappings.find(m=>m.targetField==='releaseTitle'),notesMapping:mappings.find(m=>m.targetField==='notes'),allMappings:JSON.stringify(mappings.map(m=>({csvColumn:m.csvColumn,targetField:m.targetField,fieldType:m.fieldType})))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // Build song patterns from mappings
      mappings.forEach((mapping) => {
        if (mapping.fieldType === 'song' && mapping.songIndex && mapping.targetField) {
          if (!mappingConfig.songPatterns[mapping.songIndex]) {
            mappingConfig.songPatterns[mapping.songIndex] = {
              name: '',
              artistName: '',
              bandName: '',
              composerName: '',
              recordLabelName: '',
              studioName: '',
              genre: '',
              producerArchived: '',
              performerName: '',
            }
          }
          const fieldKey = mapping.targetField as keyof typeof mappingConfig.songPatterns[number]
          if (fieldKey in mappingConfig.songPatterns[mapping.songIndex]) {
            mappingConfig.songPatterns[mapping.songIndex][fieldKey] = mapping.csvColumn
          }
        }
      })

      const response = await fetch('/api/import/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          csvContent: content,
          mappingConfig,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = 'Import failed'
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      
      if (result.sessionId) {
        // Initialize progress state
        setImportProgress({
          sessionId: result.sessionId,
          totalRows: result.totalRows,
          rowsProcessed: result.rowsProcessed || 0,
          percentage: result.totalRows > 0 ? Math.round(((result.rowsProcessed || 0) / result.totalRows) * 100) : 0,
          status: 'in_progress',
        })
        
        // Start batch processing (chunked for Vercel free tier)
        setPollingActive(true)
        pollingActiveRef.current = true
        
        // #region agent log
        const logDataFrontend1 = {
          location: 'app/import-csv/page.tsx:461',
          message: 'Frontend: Starting batch processing',
          data: {
            sessionId: result.sessionId,
            totalRows: result.totalRows,
            rowsProcessed: result.rowsProcessed || 0,
            needsMore: result.needsMore,
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'B',
        };
        console.log('[DEBUG] Frontend Start:', logDataFrontend1);
        fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataFrontend1) }).catch(() => {});
        // #endregion
        
        const processNextBatch = async () => {
          // Check if processing should continue
          if (!pollingActiveRef.current) {
            // #region agent log
            const logDataFrontend2 = {
              location: 'app/import-csv/page.tsx:467',
              message: 'Frontend: Batch processing stopped (polling inactive)',
              data: { sessionId: result.sessionId },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'B',
            };
            console.log('[DEBUG] Frontend Stopped:', logDataFrontend2);
            fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataFrontend2) }).catch(() => {});
            // #endregion
            return
          }
          
          try {
            // #region agent log
            const logDataFrontend3 = {
              location: 'app/import-csv/page.tsx:472',
              message: 'Frontend: Calling batch processor',
              data: { sessionId: result.sessionId },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'B',
            };
            console.log('[DEBUG] Frontend Calling Batch:', logDataFrontend3);
            fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataFrontend3) }).catch(() => {});
            // #endregion
            
            // Call batch processor endpoint
            const batchResponse = await fetch('/api/import/csv/process-batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: result.sessionId }),
            })
            
            // #region agent log
            const logDataFrontend4 = {
              location: 'app/import-csv/page.tsx:479',
              message: 'Frontend: Batch processor response received',
              data: {
                sessionId: result.sessionId,
                ok: batchResponse.ok,
                status: batchResponse.status,
              },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'B',
            };
            console.log('[DEBUG] Frontend Batch Response:', logDataFrontend4);
            fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataFrontend4) }).catch(() => {});
            // #endregion
            
            if (!batchResponse.ok) {
              // If batch endpoint fails, check progress and retry
              const errorData = await batchResponse.json().catch(() => ({}))
              console.warn('Batch processing error:', errorData.error || 'Unknown error')
              
              // Check progress to see current state
              const progressResponse = await fetch(
                `/api/import/csv/progress-simple?sessionId=${result.sessionId}`
              )
              if (progressResponse.ok) {
                const progressData = await progressResponse.json()
                setImportProgress({
                  sessionId: result.sessionId,
                  totalRows: progressData.totalRows || result.totalRows,
                  rowsProcessed: progressData.rowsProcessed || 0,
                  percentage: progressData.percentage || 0,
                  status: progressData.status || 'in_progress',
                })
                
                if (progressData.status === 'completed' || progressData.status === 'failed' || progressData.status === 'cancelled') {
                  setLoading(false)
                  setPollingActive(false)
                  pollingActiveRef.current = false
                  if (progressData.status === 'completed') {
                    // Check for failed rows
                    try {
                      const failedRowsResponse = await fetch(
                        `/api/import/csv/failed-rows?sessionId=${result.sessionId}`
                      )
                      if (failedRowsResponse.ok) {
                        const failedData = await failedRowsResponse.json()
                        if (failedData.failedRows && failedData.failedRows.length > 0) {
                          setShowFailedRows(true)
                          setImportProgress((prev) => prev ? { ...prev, status: 'completed_with_errors' } : null)
                        } else {
                          alert(`Import completed!\n\nProcessed: ${progressData.rowsProcessed} rows`)
                          router.push('/releases').catch(() => { window.location.href = '/releases' })
                        }
                      } else {
                        alert(`Import completed!\n\nProcessed: ${progressData.rowsProcessed} rows`)
                        router.push('/releases').catch(() => { window.location.href = '/releases' })
                      }
                    } catch (fetchError) {
                      console.error('Error checking failed rows:', fetchError)
                      alert(`Import completed!\n\nProcessed: ${progressData.rowsProcessed} rows`)
                      router.push('/releases').catch(() => { window.location.href = '/releases' })
                    }
                  } else if (progressData.status === 'failed') {
                    setError(progressData.error || 'Import failed')
                    setImportProgress(null)
                  }
                  return
                }
              }
              
              // Retry after delay
              if (pollingActiveRef.current) {
                pollingTimeoutRef.current = setTimeout(processNextBatch, 2000)
              }
              return
            }
            
            const batchData = await batchResponse.json()
            
            // Update progress
            const percentage = batchData.totalRows > 0 
              ? Math.round((batchData.rowsProcessed / batchData.totalRows) * 100) 
              : 0
            
            setImportProgress({
              sessionId: result.sessionId,
              totalRows: batchData.totalRows || result.totalRows,
              rowsProcessed: batchData.rowsProcessed || 0,
              percentage,
              status: batchData.completed ? 'completed' : 'in_progress',
            })
            
            // Fetch stats for real-time error display
            try {
              const statsResponse = await fetch(
                `/api/import/csv/stats?sessionId=${result.sessionId}`
              )
              if (statsResponse.ok) {
                const statsData = await statsResponse.json()
                setImportStats({
                  totalFailed: statsData.totalFailed || 0,
                  estimatedSuccess: statsData.estimatedSuccess || 0,
                  actualSuccessCount: statsData.actualSuccessCount ?? statsData.estimatedSuccess ?? 0,
                  actualErrorCount: statsData.actualErrorCount ?? 0,
                  successRate: statsData.successRate || '0.0',
                  errorCounts: statsData.errorCounts || {},
                  sampleErrors: statsData.sampleErrors || [],
                })
              }
            } catch (e) {
              // Ignore stats errors
              console.warn('Stats fetch error:', e)
            }
            
            if (batchData.completed) {
              // Import complete
              setLoading(false)
              setPollingActive(false)
              pollingActiveRef.current = false
              
              // Check for failed rows
              try {
                const failedRowsResponse = await fetch(
                  `/api/import/csv/failed-rows?sessionId=${result.sessionId}`
                )
                if (failedRowsResponse.ok) {
                  const failedData = await failedRowsResponse.json()
                  if (failedData.failedRows && failedData.failedRows.length > 0) {
                    setShowFailedRows(true)
                    setImportProgress((prev) => prev ? { ...prev, status: 'completed_with_errors' } : null)
                  } else {
                    alert(`Import completed!\n\nProcessed: ${batchData.rowsProcessed} rows`)
                    router.push('/releases').catch(() => { window.location.href = '/releases' })
                  }
                } else {
                  alert(`Import completed!\n\nProcessed: ${batchData.rowsProcessed} rows`)
                  router.push('/releases').catch(() => { window.location.href = '/releases' })
                }
              } catch (fetchError) {
                console.error('Error checking failed rows:', fetchError)
                alert(`Import completed!\n\nProcessed: ${batchData.rowsProcessed} rows`)
                router.push('/releases').catch(() => { window.location.href = '/releases' })
              }
            } else if (batchData.needsMore && pollingActiveRef.current) {
              // Process next batch after a short delay
              pollingTimeoutRef.current = setTimeout(processNextBatch, 100)
            } else if (batchData.paused) {
              // Import paused
              setLoading(false)
              if (pollingActiveRef.current) {
                pollingTimeoutRef.current = setTimeout(processNextBatch, 2000)
              }
            }
          } catch (err: any) {
            console.error('Batch processing error:', err)
            // Continue processing on error
            if (pollingActiveRef.current) {
              pollingTimeoutRef.current = setTimeout(processNextBatch, 2000)
            }
          }
        }
        
        // Start processing batches
        // Always check if there are more rows to process, even if first batch returned 0
        // This ensures we continue processing even if first batch failed silently
        const hasMoreRows = result.needsMore !== false && (result.totalRows > (result.rowsProcessed || 0))
        
        // #region agent log
        const logDataFrontendStart = {
          location: 'app/import-csv/page.tsx:692',
          message: 'Frontend: Starting batch processing decision',
          data: {
            sessionId: result.sessionId,
            totalRows: result.totalRows,
            rowsProcessed: result.rowsProcessed || 0,
            needsMore: result.needsMore,
            hasMoreRows,
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'B',
        };
        console.log('[DEBUG] Frontend Batch Decision:', logDataFrontendStart);
        fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataFrontendStart) }).catch(() => {});
        // #endregion
        
        if (hasMoreRows) {
          // #region agent log
          const logDataFrontendSchedule = {
            location: 'app/import-csv/page.tsx:710',
            message: 'Frontend: Scheduling batch processor',
            data: {
              sessionId: result.sessionId,
              delay: 100,
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'B',
          };
          console.log('[DEBUG] Frontend Scheduling:', logDataFrontendSchedule);
          fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataFrontendSchedule) }).catch(() => {});
          // #endregion
          pollingTimeoutRef.current = setTimeout(processNextBatch, 100)
        } else {
          // First batch completed everything, check for completion
          // #region agent log
          const logDataFrontendCheck = {
            location: 'app/import-csv/page.tsx:720',
            message: 'Frontend: Checking completion status',
            data: {
              sessionId: result.sessionId,
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'B',
          };
          console.log('[DEBUG] Frontend Checking Completion:', logDataFrontendCheck);
          fetch('http://127.0.0.1:7242/ingest/d1e8ad3f-7e52-4016-811c-8857d824b667', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logDataFrontendCheck) }).catch(() => {});
          // #endregion
          const progressResponse = await fetch(
            `/api/import/csv/progress-simple?sessionId=${result.sessionId}`
          )
          if (progressResponse.ok) {
            const progressData = await progressResponse.json()
            setImportProgress({
              sessionId: result.sessionId,
              totalRows: progressData.totalRows || result.totalRows,
              rowsProcessed: progressData.rowsProcessed || 0,
              percentage: progressData.percentage || 0,
              status: progressData.status || 'in_progress',
            })
            if (progressData.status === 'completed') {
              setLoading(false)
              setPollingActive(false)
              pollingActiveRef.current = false
              alert(`Import completed!\n\nProcessed: ${progressData.rowsProcessed} rows`)
              router.push('/releases').catch(() => { window.location.href = '/releases' })
            } else if (progressData.status === 'in_progress' && progressData.rowsProcessed < progressData.totalRows) {
              // Still in progress but frontend thought it was done - continue processing
              pollingTimeoutRef.current = setTimeout(processNextBatch, 100)
            }
          } else {
            // Progress check failed - try to continue with batch processor anyway
            console.warn('Progress check failed, continuing with batch processor')
            pollingTimeoutRef.current = setTimeout(processNextBatch, 1000)
          }
        }
      } else {
        throw new Error('No session ID returned')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import CSV file')
      setLoading(false)
      setImportProgress(null)
    }
  }

  const getFieldTypeOptions = (mapping: ColumnMapping) => {
    if (mapping.csvColumn.match(/^song\s*\d+/i)) {
      return 'song'
    }
    return ['submission', 'song', 'ignore']
  }

  const getTargetFieldOptions = (mapping: ColumnMapping) => {
    if (mapping.fieldType === 'song') {
      return SONG_FIELDS
    } else if (mapping.fieldType === 'submission') {
      return SUBMISSION_FIELDS
    }
    return []
  }


  return (
    <div className="container mx-auto p-6 max-w-7xl">

      <Card>
        <CardHeader>
          <CardTitle>Import CSV Files</CardTitle>
          <CardDescription>
            Upload CSV files to import releases with manual column mapping
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload">
              <Button variant="outline" asChild>
                <span>Select CSV File</span>
              </Button>
            </label>
            {file && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  {file.name}
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {/* Preview Table */}
          {preview && preview.headers && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>CSV Preview</CardTitle>
                    <CardDescription>
                      Showing {preview.previewRows?.length || 0} of {preview.totalRows || 0} rows
                      {preview.hasMultipleSongs && ' • Multiple songs per row detected'}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowMapping(!showMapping)}
                    className="gap-2"
                  >
                    <Settings2 className="w-4 h-4" />
                    {showMapping ? 'Hide' : 'Show'} Column Mapping
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {preview.headers.map((header: string, i: number) => (
                          <TableHead key={i} className="min-w-[150px]">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.previewRows?.slice(0, 5).map((row: any, rowIdx: number) => (
                        <TableRow key={rowIdx}>
                          {preview.headers.map((header: string, colIdx: number) => (
                            <TableCell key={colIdx} className="max-w-[200px] truncate">
                              {row[header] || ''}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Column Mapping Interface */}
          {preview && mappings.length > 0 && showMapping && (
            <Card>
              <CardHeader>
                <CardTitle>Column Mapping</CardTitle>
                <CardDescription>
                  Map each CSV column to a target field. Auto-suggestions are provided, but you can customize them.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mappings.map((mapping, index) => {
                    const songIndex = extractSongIndex(mapping.csvColumn)
                    const isSongColumn = !!songIndex

                    return (
                      <div
                        key={index}
                        className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg"
                      >
                        <div className="col-span-3">
                          <Label className="text-sm font-medium">CSV Column</Label>
                          <div className="mt-1 text-sm text-muted-foreground truncate">
                            {mapping.csvColumn}
                          </div>
                        </div>

                        <div className="col-span-2">
                          <Label>Field Type</Label>
                          <Select
                            value={mapping.fieldType}
                            onValueChange={(value: 'submission' | 'song' | 'ignore') => {
                              updateMapping(index, {
                                fieldType: value,
                                targetField: value === 'ignore' ? null : mapping.targetField || undefined,
                                songIndex: value === 'song' && isSongColumn ? songIndex : undefined,
                              })
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="submission">Submission</SelectItem>
                              <SelectItem value="song">Song</SelectItem>
                              <SelectItem value="ignore">Ignore</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {mapping.fieldType === 'song' && (
                          <div className="col-span-2">
                            <Label>Song Number</Label>
                            <Select
                              value={mapping.songIndex?.toString() || '1'}
                              onValueChange={(value) => {
                                updateMapping(index, {
                                  songIndex: parseInt(value, 10),
                                })
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                                  <SelectItem key={num} value={num.toString()}>
                                    Song {num}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className={mapping.fieldType === 'song' ? 'col-span-5' : 'col-span-7'}>
                          <Label>Target Field</Label>
                          <Select
                            value={mapping.targetField || 'ignore'}
                            onValueChange={(value) => {
                              updateMapping(index, {
                                targetField: value === 'ignore' ? null : value,
                              })
                            }}
                            disabled={mapping.fieldType === 'ignore'}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select target field" />
                            </SelectTrigger>
                            <SelectContent>
                              {mapping.fieldType === 'ignore' ? (
                                <SelectItem value="ignore">Ignore this column</SelectItem>
                              ) : (
                                <>
                                  <SelectItem value="ignore">Ignore this column</SelectItem>
                                  {getTargetFieldOptions(mapping).map((field) => (
                                    <SelectItem key={field.value} value={field.value}>
                                      {field.label}
                                    </SelectItem>
                                  ))}
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Progress */}
          {importProgress && importProgress.status !== 'completed_with_errors' && (
            <Card>
              <CardHeader>
                <CardTitle>Import Progress</CardTitle>
                <CardDescription>
                  The import continues in the background even if this page has errors. 
                  You can safely refresh or navigate away - the import will continue.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Processing rows...</span>
                      <span>
                        {importProgress.rowsProcessed} / {importProgress.totalRows} (
                        {importProgress.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${importProgress.percentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Status: {importProgress.status === 'paused' ? '⏸️ Paused' : importProgress.status === 'in_progress' ? '▶️ In Progress' : importProgress.status}
                      </p>
                      {importProgress.sessionId && (
                        <p className="text-xs text-muted-foreground">
                          Session ID: {importProgress.sessionId.substring(0, 8)}...
                        </p>
                      )}
                    </div>
                    
                    {/* Pause/Resume Controls */}
                    {importProgress.sessionId && (importProgress.status === 'in_progress' || importProgress.status === 'paused') && (
                      <div className="pt-2 border-t">
                        {importProgress.status === 'in_progress' ? (
                          <Button
                            variant="outline"
                            onClick={async () => {
                              if (!importProgress.sessionId) return
                              
                              try {
                                const response = await fetch('/api/import/csv/pause', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ sessionId: importProgress.sessionId }),
                                })
                                
                                if (!response.ok) {
                                  const error = await response.json()
                                  throw new Error(error.error || 'Failed to pause import')
                                }
                                
                                const result = await response.json()
                                setImportProgress(prev => prev ? { ...prev, status: 'paused' } : null)
                                alert('Import paused. You can resume it later.')
                              } catch (error: any) {
                                setError(error.message || 'Failed to pause import')
                              }
                            }}
                            className="w-full"
                          >
                            <Pause className="w-4 h-4 mr-2" />
                            Pause Import
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={async () => {
                              if (!importProgress.sessionId) return
                              
                              setLoading(true)
                              try {
                                // Try to get file content if available, otherwise resume without it
                                // The import loop will automatically continue when status changes to 'in_progress'
                                let csvContent: string | undefined = undefined
                                if (file) {
                                  try {
                                    csvContent = await file.text()
                                  } catch (e) {
                                    // File might not be available, that's okay
                                    console.log('File not available, resuming without CSV content')
                                  }
                                }
                                
                                const response = await fetch('/api/import/csv/resume-import', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    sessionId: importProgress.sessionId,
                                    csvContent: csvContent,
                                  }),
                                })
                                
                                if (!response.ok) {
                                  const error = await response.json()
                                  throw new Error(error.error || 'Failed to resume import')
                                }
                                
                                const result = await response.json()
                                setImportProgress(prev => prev ? { ...prev, status: 'in_progress' } : null)
                                setLoading(false)
                                alert(`Import resumed from row ${result.resumingFrom}`)
                                
                                // Restart polling
                                setPollingActive(true)
                                pollingActiveRef.current = true
                              } catch (error: any) {
                                setError(error.message || 'Failed to resume import')
                                setLoading(false)
                              }
                            }}
                            className="w-full"
                            disabled={loading}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Resume Import
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Real-time import stats */}
                  {importStats && (
                    <div className="pt-2 border-t space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          ✅ Success: {importStats.actualSuccessCount}
                        </span>
                        <span className="text-destructive font-medium">
                          ❌ Failed: {importStats.actualErrorCount}
                        </span>
                      </div>
                      {importStats.successRate && (
                        <p className="text-xs text-muted-foreground">
                          Success Rate: {importStats.successRate}%
                        </p>
                      )}
                      {/* Warning if no successes but rows are being processed */}
                      {importProgress && importProgress.rowsProcessed > 10 && importStats.actualSuccessCount === 0 && (
                        <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-600 dark:text-yellow-400">
                          ⚠️ Warning: {importProgress.rowsProcessed} rows processed but 0 releases created. 
                          All rows are failing validation. Check your column mappings.
                        </div>
                      )}
                      {importStats.sampleErrors.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Sample Errors:</p>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {importStats.sampleErrors.map((err, idx) => (
                              <p key={idx} className="text-xs text-destructive">
                                Row {err.row}: {err.message.substring(0, 100)}
                                {err.message.length > 100 ? '...' : ''}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                      {Object.keys(importStats.errorCounts).length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Error Types:</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(importStats.errorCounts).map(([type, count]) => (
                              <span key={type} className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded">
                                {type}: {count}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Resume button if import appears stuck */}
                  {importProgress.status === 'in_progress' && file && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground mb-2">
                        If the import appears stuck, you can resume it by clicking the button below.
                      </p>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          if (!importProgress.sessionId || !file) return
                          
                          setLoading(true)
                          try {
                            const content = await file.text()
                            const response = await fetch('/api/import/csv/resume-import', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                sessionId: importProgress.sessionId,
                                csvContent: content,
                              }),
                            })
                            
                            if (!response.ok) {
                              const error = await response.json()
                              throw new Error(error.error || 'Failed to resume import')
                            }
                            
                            const result = await response.json()
                            setImportProgress(prev => prev ? { ...prev, status: 'in_progress' } : null)
                            setLoading(false)
                            alert(`Import resumed from row ${result.resumingFrom}`)
                            
                            // Restart polling
                            setPollingActive(true)
                            pollingActiveRef.current = true
                          } catch (error: any) {
                            setError(error.message || 'Failed to resume import')
                            setLoading(false)
                          }
                        }}
                        disabled={loading}
                      >
                        Resume Import
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Failed Rows Review */}
          {showFailedRows && importProgress?.sessionId && (
            <FailedRowsReview
              sessionId={importProgress.sessionId}
              onComplete={() => {
                setShowFailedRows(false)
                router.push('/releases')
              }}
            />
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.back()} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || !preview || loading || mappings.length === 0}
            >
              {loading ? (
                importProgress ? (
                  `Importing... ${importProgress.percentage}%`
                ) : (
                  'Starting Import...'
                )
              ) : (
                'Import CSV'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
