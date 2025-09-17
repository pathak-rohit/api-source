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
    const status = searchParams.get('status') || undefined
    const buildingId = searchParams.get('buildingId') || undefined

    const supabase = getClient()
    let query = supabase
      .from('user_profiles')
      .select(`
        *,
        buildings (
          id,
          name,
          address
        )
      )`)

    if (status) query = query.eq('verification_status', status)
    if (buildingId) query = query.eq('building_id', buildingId)

    const { data, error } = await query.order('created_at', { ascending: true })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers })
    }
    return NextResponse.json({ data: data || [] }, { status: 200, headers })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500, headers })
  }
}

