import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const returnSlug: string | undefined = body.returnSlug
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!

  const { data: user } = await db
    .from('users')
    .select('id, email, stripe_customer_id')
    .eq('id', session.user.id)
    .single()

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const params: Record<string, unknown> = {
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${siteUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}${returnSlug ? `&slug=${returnSlug}` : ''}`,
    cancel_url: returnSlug ? `${siteUrl}/medications/${returnSlug}` : siteUrl,
    metadata: { userId: user.id },
  }

  if (user.stripe_customer_id) {
    params.customer = user.stripe_customer_id
  } else {
    params.customer_email = user.email
  }

  const checkoutSession = await stripe.checkout.sessions.create(params as any)

  return NextResponse.json({ url: checkoutSession.url })
}
