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
    const { status } = await req.json().catch(() => ({}))
    const allowedStatuses = new Set(['new', 'in_progress', 'resolved'])
    if (!status || !allowedStatuses.has(status)) {
      return NextResponse.json({ error: 'Invalid status update' }, { status: 400, headers })
    }

    const supabase = getClient()
    const update: Record<string, any> = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'resolved') {
      update.resolved_at = new Date().toISOString()
    } else {
      update.resolved_at = null
    }

    const { data, error } = await supabase
      .from('issues')
      .update(update)
      .eq('id', params.id)
      .select(`
        *,
        buildings (
          id,
          name
        ),
        user_profiles!issues_reporter_id_fkey (
          id,
          name,
          unit_number,
          phone,
          email
        )
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers })
    }

    return NextResponse.json({ data }, { status: 200, headers })
  } catch (error: any) {
    console.error('Admin issue update failed:', error)
    return NextResponse.json({ error: error?.message || 'Failed to update issue' }, { status: 500, headers })
  }
}
