import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/db'

// Force dynamic rendering - don't execute during build
export const dynamic = 'force-dynamic'

// Default form fields structure with Myanmar translations
const DEFAULT_FORM_FIELDS = [
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

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role as UserRole
    if (role !== UserRole.ADMIN && role !== UserRole.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch from database
    const dbFields = await prisma.formField.findMany({
      orderBy: [
        { section: 'asc' },
        { order: 'asc' },
      ],
    })

    // If no fields in database, return defaults
    if (dbFields.length === 0) {
      return NextResponse.json({ fields: DEFAULT_FORM_FIELDS })
    }

    // Convert database fields to API format
    const fields = dbFields.map(field => ({
      id: field.id,
      name: field.name,
      label: field.label,
      labelMy: field.labelMy || undefined,
      placeholder: field.placeholder || undefined,
      placeholderMy: field.placeholderMy || undefined,
      type: field.type,
      required: field.required,
      section: field.section,
      order: field.order,
      options: field.options ? (field.options as any) : undefined,
    }))

    return NextResponse.json({ fields })
  } catch (error: any) {
    console.error('Error fetching form fields:', error)
    // Fallback to defaults on error
    return NextResponse.json({ fields: DEFAULT_FORM_FIELDS })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role as UserRole
    if (role !== UserRole.ADMIN && role !== UserRole.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { fields } = body

    if (!Array.isArray(fields)) {
      return NextResponse.json({ error: 'Invalid fields data' }, { status: 400 })
    }

    // Use transaction to ensure all fields are saved atomically
    await prisma.$transaction(async (tx) => {
      // Delete all existing fields
      await tx.formField.deleteMany({})

      // Insert new fields
      await tx.formField.createMany({
        data: fields.map((field: any) => ({
          name: field.name,
          label: field.label,
          labelMy: field.labelMy || null,
          placeholder: field.placeholder || null,
          placeholderMy: field.placeholderMy || null,
          type: field.type,
          required: field.required || false,
          section: field.section,
          order: field.order || 0,
          options: field.options ? field.options : null,
        })),
      })
    })

    return NextResponse.json({ success: true, fields })
  } catch (error: any) {
    console.error('Error saving form fields:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save form fields' },
      { status: 500 }
    )
  }
}

