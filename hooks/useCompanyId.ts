'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const cache = new Map<string, string>()

export function useCompanyId(): string | null {
  const [companyId, setCompanyId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      if (cache.has(user.id)) {
        setCompanyId(cache.get(user.id) ?? null)
        return
      }
      supabase.from('profiles').select('company_id').eq('id', user.id).single().then(({ data }) => {
        const cid = data?.company_id ?? null
        if (cid) cache.set(user.id, cid)
        setCompanyId(cid)
      })
    })
  }, [supabase])

  return companyId
}
