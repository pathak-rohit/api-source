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

  const stats = {
    totalBuildings: 0,
    totalResidents: 0,
    pendingApprovals: 0,
    activeIssues: 0,
    totalAnnouncements: 0,
  }

  try {
    const { searchParams } = new URL(req.url)
    const buildingId = searchParams.get('buildingId') || undefined

    const supabase = getClient()

    // Buildings
    let buildingsQ = supabase.from('buildings').select('*', { count: 'exact', head: true }).eq('is_active', true)
    if (buildingId) buildingsQ = buildingsQ.eq('id', buildingId)
    const { count: bcount } = await buildingsQ
    stats.totalBuildings = bcount || 0

    // Approved residents
    let residentsQ = supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('verification_status', 'approved')
    if (buildingId) residentsQ = residentsQ.eq('building_id', buildingId)
    const { count: rcount } = await residentsQ
    stats.totalResidents = rcount || 0

    // Pending approvals
    let pendingQ = supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending')
    if (buildingId) pendingQ = pendingQ.eq('building_id', buildingId)
    const { count: pcount } = await pendingQ
    stats.pendingApprovals = pcount || 0

    // Issues
    let issuesQ = supabase.from('issues').select('*', { count: 'exact', head: true }).in('status', ['new', 'in_progress'])
    if (buildingId) issuesQ = issuesQ.eq('building_id', buildingId)
    const { count: icount } = await issuesQ
    stats.activeIssues = icount || 0

    // Announcements
    let annQ = supabase.from('announcements').select('*', { count: 'exact', head: true })
    if (buildingId) annQ = annQ.eq('building_id', buildingId)
    const { count: acount } = await annQ
    stats.totalAnnouncements = acount || 0

    return NextResponse.json({ data: stats }, { status: 200, headers })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500, headers })
  }
}

