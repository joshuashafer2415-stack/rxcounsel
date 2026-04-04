import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import Mux from '@mux/mux-node'
import { MedicationType } from '@/lib/types'

// This route downloads a video from a URL (e.g. HeyGen CDN) and uploads it to Mux.
// The download + Mux polling can take up to a minute, so we set a generous timeout.
export const maxDuration = 60

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
})

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { medicationId, type, videoUrl } = body as {
    medicationId: string
    type: MedicationType
    videoUrl: string
  }

  if (!medicationId || !type || !videoUrl) {
    return NextResponse.json(
      { error: 'medicationId, type, and videoUrl are required' },
      { status: 400 }
    )
  }

  try {
    // Download the video from the HeyGen CDN URL
    const videoRes = await fetch(videoUrl)
    if (!videoRes.ok) {
      return NextResponse.json(
        { error: `Failed to download video from URL: ${videoRes.status}` },
        { status: 502 }
      )
    }
    const videoBuffer = await videoRes.arrayBuffer()

    // Create a Mux direct upload target
    const upload = await mux.video.uploads.create({
      new_asset_settings: { playback_policy: ['public'] },
      cors_origin: '*',
    })

    // PUT the video buffer directly to the Mux upload URL
    const putRes = await fetch(upload.url, {
      method: 'PUT',
      body: videoBuffer,
    })

    if (!putRes.ok) {
      return NextResponse.json(
        { error: `Failed to upload video to Mux: ${putRes.status}` },
        { status: 502 }
      )
    }

    // Poll Mux until the asset is ready (up to 20 attempts × 3 seconds = 60 seconds)
    let asset = null
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 3000))
      const uploadStatus = await mux.video.uploads.retrieve(upload.id)
      if (uploadStatus.asset_id) {
        const candidate = await mux.video.assets.retrieve(uploadStatus.asset_id)
        if (candidate.status === 'ready') {
          asset = candidate
          break
        }
      }
    }

    if (!asset) {
      return NextResponse.json(
        { error: 'Mux asset did not become ready within the timeout period' },
        { status: 504 }
      )
    }

    const playbackId = asset.playback_ids?.[0]?.id ?? null

    // Upsert into videos table (replace if a video for this type already exists)
    const { data, error } = await db
      .from('videos')
      .upsert(
        {
          medication_id: medicationId,
          type,
          mux_asset_id: asset.id,
          mux_playback_id: playbackId,
          is_free: type === 'core',
        },
        { onConflict: 'medication_id,type' }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to import video' },
      { status: 500 }
    )
  }
}
