import { Mux } from '@mux/mux-node'

export async function signMuxPlaybackId(playbackId: string): Promise<string> {
  if (!process.env.MUX_SIGNING_KEY_ID) {
    throw new Error('MUX_SIGNING_KEY_ID environment variable is not set')
  }
  if (!process.env.MUX_SIGNING_PRIVATE_KEY) {
    throw new Error('MUX_SIGNING_PRIVATE_KEY environment variable is not set')
  }

  const mux = new Mux({
    tokenId: process.env.MUX_SIGNING_KEY_ID,
    tokenSecret: process.env.MUX_SIGNING_PRIVATE_KEY,
  })

  return mux.jwt.signPlaybackId(playbackId, {
    keyId: process.env.MUX_SIGNING_KEY_ID,
    keySecret: process.env.MUX_SIGNING_PRIVATE_KEY,
    type: 'video',
    expiration: '4h',
  })
}
