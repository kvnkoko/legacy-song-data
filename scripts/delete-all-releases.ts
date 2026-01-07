import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting deletion of all releases and related data...\n')

  try {
    // Step 1: Get all releases to identify related artists, employees, and users
    const allReleases = await prisma.release.findMany({
      select: {
        id: true,
        artistId: true,
        assignedA_RId: true,
      },
    })

    console.log(`Found ${allReleases.length} releases to delete`)

    // Collect unique artist IDs and employee IDs from releases
    const artistIds = new Set<string>()
    const employeeIds = new Set<string>()

    allReleases.forEach((release) => {
      artistIds.add(release.artistId)
      if (release.assignedA_RId) {
        employeeIds.add(release.assignedA_RId)
      }
    })

    console.log(`Found ${artistIds.size} unique artists linked to releases`)
    console.log(`Found ${employeeIds.size} unique employees linked to releases`)

    // Step 2: Delete all releases (this will cascade delete tracks, platform requests, etc.)
    console.log('\nDeleting all releases...')
    const deleteReleasesResult = await prisma.release.deleteMany({})
    console.log(`✓ Deleted ${deleteReleasesResult.count} releases`)

    // Step 3: Find artists that have no releases left and were likely created for releases
    // (identified by having no releases, or having email pattern like @imported.local)
    console.log('\nFinding artists to delete...')
    const artistsToDelete = await prisma.artist.findMany({
      where: {
        id: {
          in: Array.from(artistIds),
        },
        releases: {
          none: {},
        },
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    })

    console.log(`Found ${artistsToDelete.length} artists with no releases to delete`)

    // Collect user IDs from artists that will be deleted
    const artistUserIds = new Set<string>()
    artistsToDelete.forEach((artist) => {
      if (artist.userId) {
        artistUserIds.add(artist.userId)
      }
    })

    // Step 4: Delete artists
    if (artistsToDelete.length > 0) {
      const artistIdsToDelete = artistsToDelete.map((a) => a.id)
      const deleteArtistsResult = await prisma.artist.deleteMany({
        where: {
          id: {
            in: artistIdsToDelete,
          },
        },
      })
      console.log(`✓ Deleted ${deleteArtistsResult.count} artists`)
    }

    // Step 5: Find employees that were created for releases
    // (identified by having email pattern like @imported.local or having no assigned releases)
    console.log('\nFinding employees to delete...')
    const employeesToDelete = await prisma.employee.findMany({
      where: {
        id: {
          in: Array.from(employeeIds),
        },
        assignedReleases: {
          none: {},
        },
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    })

    // Filter to only employees with imported email pattern
    const importedEmployees = employeesToDelete.filter((emp) => {
      const email = emp.user?.email || ''
      return email.includes('@imported.local')
    })

    console.log(`Found ${importedEmployees.length} imported employees to delete`)

    // Collect user IDs from employees that will be deleted
    const employeeUserIds = new Set<string>()
    importedEmployees.forEach((emp) => {
      employeeUserIds.add(emp.userId)
    })

    // Step 6: Delete employees (this will cascade delete the user due to onDelete: Cascade)
    if (importedEmployees.length > 0) {
      const employeeIdsToDelete = importedEmployees.map((e) => e.id)
      const deleteEmployeesResult = await prisma.employee.deleteMany({
        where: {
          id: {
            in: employeeIdsToDelete,
          },
        },
      })
      console.log(`✓ Deleted ${deleteEmployeesResult.count} employees`)
    }

    // Step 7: Delete users that were created for artists (if they have imported email pattern)
    console.log('\nFinding users to delete...')
    const usersToDelete = await prisma.user.findMany({
      where: {
        id: {
          in: Array.from(artistUserIds),
        },
        email: {
          contains: '@imported.local',
        },
        artist: null, // Artist was already deleted
      },
    })

    if (usersToDelete.length > 0) {
      const userIdsToDelete = usersToDelete.map((u) => u.id)
      const deleteUsersResult = await prisma.user.deleteMany({
        where: {
          id: {
            in: userIdsToDelete,
          },
        },
      })
      console.log(`✓ Deleted ${deleteUsersResult.count} users`)
    }

    // Step 8: Also delete any remaining users with imported email pattern that might be orphaned
    const orphanedUsers = await prisma.user.findMany({
      where: {
        email: {
          contains: '@imported.local',
        },
        artist: null,
        employee: null,
      },
    })

    if (orphanedUsers.length > 0) {
      const orphanedUserIds = orphanedUsers.map((u) => u.id)
      const deleteOrphanedResult = await prisma.user.deleteMany({
        where: {
          id: {
            in: orphanedUserIds,
          },
        },
      })
      console.log(`✓ Deleted ${deleteOrphanedResult.count} orphaned users`)
    }

    console.log('\n✅ Deletion complete!')
    console.log('\nSummary:')
    console.log(`- Releases deleted: ${deleteReleasesResult.count}`)
    console.log(`- Artists deleted: ${artistsToDelete.length}`)
    console.log(`- Employees deleted: ${importedEmployees.length}`)
    console.log(`- Users deleted: ${(usersToDelete.length || 0) + (orphanedUsers.length || 0)}`)
  } catch (error) {
    console.error('Error during deletion:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
