import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Find releases that might be from List3(2000).csv
 * Searches by:
 * - rawRow data containing "List3"
 * - Notes containing "List3"
 * - Recent releases (last 30 days)
 */
async function findList3Releases() {
  console.log(`\n🔍 Searching for releases from List3(2000).csv...\n`)

  // Search in rawRow JSON data
  const releasesByRawRow = await prisma.release.findMany({
    where: {
      OR: [
        {
          rawRow: {
            path: [],
            string_contains: 'List3',
          },
        },
      ],
    },
    select: {
      id: true,
      title: true,
      artist: {
        select: {
          name: true,
        },
      },
      createdAt: true,
      submittedAt: true,
    },
    take: 100,
  })

  console.log(`📊 Found ${releasesByRawRow.length} release(s) with "List3" in rawRow data`)

  // Search in notes
  const releasesByNotes = await prisma.release.findMany({
    where: {
      notes: {
        contains: 'List3',
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
      title: true,
      artist: {
        select: {
          name: true,
        },
      },
      createdAt: true,
      submittedAt: true,
    },
    take: 100,
  })

  console.log(`📊 Found ${releasesByNotes.length} release(s) with "List3" in notes`)

  // Get recent releases (last 30 days) - might be from List3
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentReleases = await prisma.release.findMany({
    where: {
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
    select: {
      id: true,
      title: true,
      artist: {
        select: {
          name: true,
        },
      },
      createdAt: true,
      submittedAt: true,
      rawRow: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
  })

  console.log(`📊 Found ${recentReleases.length} recent release(s) (last 30 days)`)

  // Combine and deduplicate
  const allReleaseIds = new Set<string>()
  const allReleases: Array<{
    id: string
    title: string
    artistName: string
    createdAt: Date
    submittedAt: Date
    source: string
  }> = []

  releasesByRawRow.forEach(r => {
    if (!allReleaseIds.has(r.id)) {
      allReleaseIds.add(r.id)
      allReleases.push({
        id: r.id,
        title: r.title,
        artistName: r.artist.name,
        createdAt: r.createdAt,
        submittedAt: r.submittedAt,
        source: 'rawRow',
      })
    }
  })

  releasesByNotes.forEach(r => {
    if (!allReleaseIds.has(r.id)) {
      allReleaseIds.add(r.id)
      allReleases.push({
        id: r.id,
        title: r.title,
        artistName: r.artist.name,
        createdAt: r.createdAt,
        submittedAt: r.submittedAt,
        source: 'notes',
      })
    }
  })

  console.log(`\n📋 Summary of potentially List3 releases:`)
  console.log(`   Total unique releases found: ${allReleases.length}`)
  
  if (allReleases.length > 0) {
    console.log(`\n   First 10 releases:`)
    allReleases.slice(0, 10).forEach((r, i) => {
      console.log(`   ${i + 1}. "${r.title}" by ${r.artistName} (${r.source}) - Created: ${r.createdAt.toISOString()}`)
    })
  }

  // Also check total release count
  const totalReleases = await prisma.release.count()
  console.log(`\n📊 Total releases in database: ${totalReleases}`)

  return {
    found: allReleases.length,
    releases: allReleases,
    totalReleases,
  }
}

async function main() {
  try {
    await findList3Releases()
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
