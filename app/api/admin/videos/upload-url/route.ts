import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import Mux from '@mux/mux-node'
import { MedicationType } from '@/lib/types'

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
})

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const medicationId = searchParams.get('medicationId')
  const type = searchParams.get('type') as MedicationType | null

  if (!medicationId || !type) {
    return NextResponse.json({ error: 'medicationId and type are required' }, { status: 400 })
  }

  const validTypes: MedicationType[] = ['core', 'interactions', 'warnings', 'tips']
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const upload = await mux.video.uploads.create({
    new_asset_settings: {
      playback_policy: ['public'],
      mp4_support: 'none',
    },
    cors_origin: process.env.NEXT_PUBLIC_SITE_URL || '*',
  })

  return NextResponse.json({
    uploadUrl: upload.url,
    uploadId: upload.id,
  })
}
