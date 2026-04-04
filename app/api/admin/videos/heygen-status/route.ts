import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const videoId = searchParams.get('videoId')

  if (!videoId) {
    return NextResponse.json({ error: 'videoId is required' }, { status: 400 })
  }

  const apiKey = process.env.HEYGEN_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'HeyGen API key not configured' }, { status: 500 })
  }

  try {
    const heygenRes = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`,
      {
        headers: {
          'X-Api-Key': apiKey,
        },
      }
    )

    const heygenData = await heygenRes.json()

    if (!heygenRes.ok) {
      return NextResponse.json(
        { error: heygenData.message || 'HeyGen status API error' },
        { status: 502 }
      )
    }

    const status: string = heygenData?.data?.status ?? 'unknown'
    const videoUrl: string | null = heygenData?.data?.video_url ?? null

    return NextResponse.json({ status, videoUrl })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to check HeyGen status' },
      { status: 500 }
    )
  }
}
