'use client'
import MuxPlayer from '@mux/mux-player-react'

interface VideoPlayerProps {
  playbackId: string | null
  title: string
}

export default function VideoPlayer({ playbackId, title }: VideoPlayerProps) {
  if (!playbackId) {
    return (
      <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
        <p className="text-gray-500 text-sm">Video coming soon</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden">
      <MuxPlayer
        playbackId={playbackId}
        metadata={{ video_title: title }}
        autoPlay="muted"
        muted
        style={{ width: '100%', aspectRatio: '16/9' }}
      />
    </div>
  )
}
