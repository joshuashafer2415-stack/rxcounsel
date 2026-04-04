import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { MedicationType } from '@/lib/types'

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { medicationId, type, scriptContent } = body as {
    medicationId: string
    type: MedicationType
    scriptContent: string
  }

  if (!medicationId || !type || !scriptContent) {
    return NextResponse.json(
      { error: 'medicationId, type, and scriptContent are required' },
      { status: 400 }
    )
  }

  const apiKey = process.env.HEYGEN_API_KEY
  const avatarId = process.env.HEYGEN_AVATAR_ID

  if (!apiKey || !avatarId) {
    return NextResponse.json(
      { error: 'HeyGen API key or avatar ID not configured' },
      { status: 500 }
    )
  }

  try {
    const heygenRes = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_inputs: [
          {
            character: {
              type: 'avatar',
              avatar_id: avatarId,
              avatar_style: 'normal',
            },
            voice: {
              type: 'text',
              input_text: scriptContent,
              voice_id: 'bcdcc5866ae94539b1a8101508552b98',
            },
          },
        ],
        dimension: { width: 1280, height: 720 },
      }),
    })

    const heygenData = await heygenRes.json()

    if (!heygenRes.ok) {
      return NextResponse.json(
        { error: heygenData.message || 'HeyGen API error' },
        { status: 502 }
      )
    }

    const videoId = heygenData?.data?.video_id
    if (!videoId) {
      return NextResponse.json(
        { error: 'HeyGen did not return a video_id' },
        { status: 502 }
      )
    }

    return NextResponse.json({ videoId })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to call HeyGen API' },
      { status: 500 }
    )
  }
}
