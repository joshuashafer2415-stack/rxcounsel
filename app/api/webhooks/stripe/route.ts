import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'

async function getUserIdBySubscription(subscriptionId: string): Promise<string | null> {
  const { data } = await db
    .from('users')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()
  return data?.id ?? null
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any
        const userId = session.metadata?.userId
        if (!userId) break
        await db
          .from('users')
          .update({
            subscription_status: 'active',
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
          })
          .eq('id', userId)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as any
        const userId = await getUserIdBySubscription(invoice.subscription)
        if (!userId) break
        const periodEnd = invoice.lines?.data?.[0]?.period?.end
        if (periodEnd) {
          await db
            .from('users')
            .update({
              subscription_period_end: new Date(periodEnd * 1000).toISOString(),
            })
            .eq('id', userId)
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as any
        const userId = await getUserIdBySubscription(sub.id)
        if (!userId) break
        await db
          .from('users')
          .update({
            subscription_status: sub.status === 'active' ? 'active' : sub.status,
            subscription_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          })
          .eq('id', userId)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as any
        const userId = await getUserIdBySubscription(sub.id)
        if (!userId) break
        await db
          .from('users')
          .update({ subscription_status: 'canceled' })
          .eq('id', userId)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any
        const userId = await getUserIdBySubscription(invoice.subscription)
        if (!userId) break
        await db
          .from('users')
          .update({ subscription_status: 'past_due' })
          .eq('id', userId)
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
