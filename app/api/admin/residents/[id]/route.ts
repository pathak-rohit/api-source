import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authorize, withCors } from '../../_lib/auth'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
}

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: withCors(req) })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const headers = withCors(req)
  const authz = authorize(req)
  if (!authz.ok) return authz.res

  try {
    const body = await req.json().catch(() => ({})) as { status?: string; reason?: string }
    if (!body.status || !['approved', 'rejected', 'pending'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400, headers })
    }
    const update: any = { verification_status: body.status }
    if (body.status === 'approved') {
      update.verified_at = new Date().toISOString()
      update.rejection_reason = null
    }
    if (body.status === 'rejected') {
      update.rejection_reason = body.reason || null
    }
    const supabase = getClient()
    const { data, error } = await supabase
      .from('user_profiles')
      .update(update)
      .eq('id', params.id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers })
    }
    return NextResponse.json({ data }, { status: 200, headers })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500, headers })
  }
}

