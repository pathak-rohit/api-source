import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authorize, withCors } from '../_lib/auth'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
}

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: withCors(req) })
}

export async function GET(req: Request) {
  const headers = withCors(req)
  const authz = authorize(req)
  if (!authz.ok) return authz.res

  try {
    const { searchParams } = new URL(req.url)
    const buildingId = searchParams.get('buildingId') || undefined
    const status = searchParams.get('status') || undefined
    const priority = searchParams.get('priority') || undefined

    const supabase = getClient()
    let query = supabase
      .from('issues')
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
      .order('created_at', { ascending: false })

    if (buildingId) query = query.eq('building_id', buildingId)
    if (status) query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers })
    }

    return NextResponse.json({ data: data || [] }, { status: 200, headers })
  } catch (error: any) {
    console.error('Admin issues fetch failed:', error)
    return NextResponse.json({ error: error?.message || 'Failed to load issues' }, { status: 500, headers })
  }
}
