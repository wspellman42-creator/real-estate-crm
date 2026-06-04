'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

let cached: string | null = null

export function useCompanyId(): string | null {
  const [companyId, setCompanyId] = useState<string | null>(cached)
  const supabase = createClient()

  useEffect(() => {
    if (cached) return
    supabase.from('profiles').select('company_id').single().then(({ data }) => {
      cached = data?.company_id ?? null
      setCompanyId(cached)
    })
  }, [])

  return companyId
}
