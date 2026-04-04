import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import Mux from '@mux/mux-node'
import { MedicationType } from '@/lib/types'

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
})

// Core video is free; others are paid
const FREE_TYPES: MedicationType[] = ['core']

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { medicationId, type, uploadId } = body as {
    medicationId: string
    type: MedicationType
    uploadId: string
  }

  if (!medicationId || !type || !uploadId) {
    return NextResponse.json(
      { error: 'medicationId, type, and uploadId are required' },
      { status: 400 }
    )
  }

  // Fetch the upload from Mux to get the asset ID
  const upload = await mux.video.uploads.retrieve(uploadId)

  if (!upload.asset_id) {
    return NextResponse.json(
      { error: 'Asset not ready yet — upload may still be processing' },
      { status: 202 }
    )
  }

  // Fetch the asset to get the playback ID
  const asset = await mux.video.assets.retrieve(upload.asset_id)

  const playbackId = asset.playback_ids?.[0]?.id || null

  const { data, error } = await db
    .from('videos')
    .upsert(
      {
        medication_id: medicationId,
        type,
        mux_asset_id: asset.id,
        mux_playback_id: playbackId,
        is_free: FREE_TYPES.includes(type),
      },
      {
        onConflict: 'medication_id,type',
      }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
