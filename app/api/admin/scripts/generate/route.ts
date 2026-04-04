import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'
import { MedicationType } from '@/lib/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SCRIPT_PROMPTS: Record<MedicationType, (drug: string) => string> = {
  core: (drug) =>
    `Write a 90-second pharmacist counseling script for ${drug}. Cover: what it's used for, how to take it, common side effects, and one key thing to remember. Write in plain conversational language a patient can understand. No technical jargon.`,
  interactions: (drug) =>
    `Write a 60-second script about drug interactions and foods to avoid for ${drug}. Be specific about what to avoid and why. Conversational language.`,
  warnings: (drug) =>
    `Write a 60-second script about warning signs for ${drug} — when a patient should call their doctor or go to the ER. Be specific and actionable.`,
  tips: (drug) =>
    `Write a 60-second script about missed doses, storage, and refill tips for ${drug}. Practical advice.`,
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { medicationId, type } = body as { medicationId: string; type: MedicationType }

  if (!medicationId || !type) {
    return NextResponse.json({ error: 'medicationId and type are required' }, { status: 400 })
  }

  const validTypes: MedicationType[] = ['core', 'interactions', 'warnings', 'tips']
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  // Fetch medication
  const { data: medication, error: medError } = await db
    .from('medications')
    .select('*')
    .eq('id', medicationId)
    .single()

  if (medError || !medication) {
    return NextResponse.json({ error: 'Medication not found' }, { status: 404 })
  }

  const drugName = medication.generic_name

  // Fetch from OpenFDA
  let fdaSourceData: string | null = null
  try {
    const fdaRes = await fetch(
      `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(drugName)}"&limit=1`
    )
    if (fdaRes.ok) {
      const fdaJson = await fdaRes.json()
      fdaSourceData = JSON.stringify(fdaJson?.results?.[0] || null)
    }
  } catch {
    // Non-fatal: proceed without FDA data
    fdaSourceData = null
  }

  // Build context for Claude
  const fdaContext = fdaSourceData
    ? `\n\nHere is relevant FDA label data for context (use as a reference, not verbatim):\n${fdaSourceData.slice(0, 3000)}`
    : ''

  const prompt = SCRIPT_PROMPTS[type](drugName) + fdaContext

  // Call Claude
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const scriptContent =
    message.content[0].type === 'text' ? message.content[0].text : ''

  // Upsert script in database
  const { data: script, error: scriptError } = await db
    .from('scripts')
    .upsert(
      {
        medication_id: medicationId,
        type,
        content: scriptContent,
        fda_source_data: fdaSourceData,
        status: 'draft',
      },
      {
        onConflict: 'medication_id,type',
      }
    )
    .select()
    .single()

  if (scriptError) {
    return NextResponse.json({ error: scriptError.message }, { status: 500 })
  }

  return NextResponse.json(script)
}
