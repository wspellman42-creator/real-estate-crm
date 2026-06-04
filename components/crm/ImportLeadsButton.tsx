'use client'

import { useState, useRef } from 'react'
import { Upload, X, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LEAD_SOURCES, LEAD_STATUSES, LEAD_TYPES } from '@/lib/utils'
import type { LeadStatus, LeadType } from '@/lib/types'

interface Props {
  agents: { id: string; full_name: string }[]
}

type FieldKey =
  | 'first_name' | 'last_name' | 'email' | 'phone'
  | 'address' | 'city' | 'state' | 'zip'
  | 'status' | 'lead_type' | 'lead_source' | 'pipeline_type'
  | 'assigned_agent_id' | 'deal_value' | 'skip'

const FIELD_OPTIONS: { value: FieldKey; label: string }[] = [
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'address', label: 'Address' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'zip', label: 'Zip' },
  { value: 'status', label: 'Status' },
  { value: 'lead_type', label: 'Lead Type' },
  { value: 'lead_source', label: 'Lead Source' },
  { value: 'pipeline_type', label: 'Pipeline Type' },
  { value: 'assigned_agent_id', label: 'Agent' },
  { value: 'deal_value', label: 'Deal Value' },
  { value: 'skip', label: '— Skip —' },
]

// Auto-map common Lofty / generic CSV column names
function autoMap(header: string): FieldKey {
  const h = header.toLowerCase().replace(/[\s_\-]+/g, '')
  if (h.includes('firstname') || h === 'first') return 'first_name'
  if (h.includes('lastname') || h === 'last') return 'last_name'
  if (h.includes('email')) return 'email'
  if (h.includes('phone') || h.includes('mobile') || h.includes('cell')) return 'phone'
  if (h.includes('address') && !h.includes('city') && !h.includes('state')) return 'address'
  if (h.includes('city')) return 'city'
  if (h.includes('state') || h.includes('province')) return 'state'
  if (h.includes('zip') || h.includes('postal')) return 'zip'
  if (h.includes('status') || h.includes('leadstatus')) return 'status'
  if (h.includes('type') || h.includes('leadtype') || h.includes('contacttype')) return 'lead_type'
  if (h.includes('source') || h.includes('leadsource')) return 'lead_source'
  if (h.includes('pipeline')) return 'pipeline_type'
  if (h.includes('agent') || h.includes('assignedto') || h.includes('owner')) return 'assigned_agent_id'
  if (h.includes('price') || h.includes('value') || h.includes('dealvalue')) return 'deal_value'
  return 'skip'
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length === 0) return { headers: [], rows: [] }
  const parse = (line: string) => {
    const result: string[] = []
    let cur = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuote = !inQuote
      } else if (ch === ',' && !inQuote) {
        result.push(cur.trim()); cur = ''
      } else {
        cur += ch
      }
    }
    result.push(cur.trim())
    return result
  }
  return { headers: parse(lines[0]), rows: lines.slice(1).map(parse) }
}

function normalizeStatus(val: string): LeadStatus {
  const v = val.toLowerCase()
  if (v.includes('attempt') || v.includes('contact')) return 'Attempting Contact'
  if (v.includes('active')) return 'Active'
  if (v.includes('nurture') || v.includes('long')) return 'Nurture'
  if (v.includes('appointment')) return 'Appointment Set'
  if (v.includes('client')) return 'Client'
  if (v.includes('contract')) return 'Under Contract'
  if (v.includes('close') || v.includes('sold')) return 'Closed'
  if (v.includes('lost') || v.includes('dead') || v.includes('archive')) return 'Lost'
  return 'New'
}

function normalizeLeadType(val: string): LeadType {
  const v = val.toLowerCase()
  if (v.includes('seller') || v.includes('list')) return 'Seller'
  if (v.includes('invest')) return 'Investor'
  if (v.includes('past') || v.includes('previous')) return 'Past Client'
  if (v.includes('sphere') || v.includes('referral') || v.includes('contact')) return 'Sphere'
  return 'Buyer'
}

function normalizeSource(val: string): string {
  const v = val.toLowerCase()
  const sources = LEAD_SOURCES as readonly string[]
  const exact = sources.find(s => s.toLowerCase() === v)
  if (exact) return exact
  if (v.includes('facebook') || v.includes('fb') || v.includes('meta')) return 'Facebook Page'
  if (v.includes('zillow') || v.includes('z57')) return 'Zillow'
  if (v.includes('call') || v.includes('phone') || v.includes('inbound')) return 'Call In'
  if (v.includes('email')) return 'Email'
  if (v.includes('open house') || v.includes('openhouse')) return 'Open House'
  if (v.includes('past') || v.includes('previous')) return 'Past Client'
  if (v.includes('referral') || v.includes('refer')) return 'Referral'
  if (v.includes('veteran') || v.includes('vu')) return 'Veterans United'
  if (v.includes('website') || v.includes('web') || v.includes('online') || v.includes('internet')) return 'Website'
  if (v.includes('personal') || v.includes('sphere') || v.includes('soi')) return 'Personal'
  return 'Other'
}

export default function ImportLeadsButton({ agents }: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'upload' | 'map' | 'importing' | 'done'>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<number, FieldKey>>({})
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  function reset() {
    setStep('upload'); setHeaders([]); setRows([]); setMapping({}); setResult(null)
  }

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const { headers: h, rows: r } = parseCSV(text)
      if (!h.length) return
      setHeaders(h)
      setRows(r)
      const m: Record<number, FieldKey> = {}
      h.forEach((col, i) => { m[i] = autoMap(col) })
      setMapping(m)
      setStep('map')
    }
    reader.readAsText(file)
  }

  async function doImport() {
    setStep('importing')
    const { data: { user } } = await supabase.auth.getUser()
    const imported: number[] = []
    const errors: string[] = []

    const batchSize = 50
    const records = rows.filter(r => r.some(c => c.trim()))

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize).map((row, idx) => {
        const rec: Record<string, unknown> = {
          status: 'New' as LeadStatus,
          lead_type: 'Buyer' as LeadType,
          pipeline_type: 'personal',
        }
        Object.entries(mapping).forEach(([colIdx, field]) => {
          if (field === 'skip') return
          const val = (row[Number(colIdx)] ?? '').trim()
          if (!val) return
          if (field === 'status') rec.status = normalizeStatus(val)
          else if (field === 'lead_type') rec.lead_type = normalizeLeadType(val)
          else if (field === 'lead_source') rec.lead_source = normalizeSource(val)
          else if (field === 'pipeline_type') rec.pipeline_type = val.toLowerCase().includes('company') ? 'company' : 'personal'
          else if (field === 'deal_value') rec.deal_value = parseFloat(val.replace(/[^0-9.]/g, '')) || null
          else if (field === 'assigned_agent_id') {
            const match = agents.find(a => a.full_name.toLowerCase().includes(val.toLowerCase()))
            if (match) rec.assigned_agent_id = match.id
          }
          else rec[field] = val
        })
        // Require at least a name
        if (!rec.first_name && !rec.last_name) {
          // Try splitting a "full name" field if that was mapped to first_name
          if (typeof rec.first_name === 'string' && rec.first_name.includes(' ')) {
            const parts = (rec.first_name as string).split(' ')
            rec.first_name = parts[0]
            rec.last_name = parts.slice(1).join(' ')
          } else {
            rec.first_name = `Lead ${i + idx + 1}`
            rec.last_name = ''
          }
        }
        return rec
      })

      const { error, count } = await supabase.from('leads').insert(batch, { count: 'exact' })
      if (error) errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`)
      else imported.push(count ?? batch.length)
    }

    setResult({ imported: imported.reduce((a, b) => a + b, 0), skipped: 0, errors })
    setStep('done')
    router.refresh()
  }

  const inputCls = 'border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-full'

  return (
    <>
      <button
        onClick={() => { setOpen(true); reset() }}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Upload size={15} />
        Import CSV
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Import Leads from CSV</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {step === 'upload' && 'Upload a CSV exported from Lofty or any CRM'}
                  {step === 'map' && `${rows.length} rows found — map your columns below`}
                  {step === 'importing' && 'Importing leads…'}
                  {step === 'done' && 'Import complete'}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* STEP: Upload */}
              {step === 'upload' && (
                <div
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload size={36} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-700">Drop your CSV here or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">Exports from Lofty, Follow Up Boss, kvCORE, or any CRM work</p>
                  <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                </div>
              )}

              {/* STEP: Map */}
              {step === 'map' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500">We auto-detected column mappings. Adjust any that look wrong, then click Import.</p>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-4 py-2.5 font-semibold text-gray-600 w-1/2">CSV Column</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-gray-600 w-1/2">Maps to Field</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {headers.map((col, i) => (
                          <tr key={i} className={mapping[i] === 'skip' ? 'opacity-40' : ''}>
                            <td className="px-4 py-2 text-gray-700 font-medium">{col}</td>
                            <td className="px-4 py-2">
                              <select
                                value={mapping[i] ?? 'skip'}
                                onChange={e => setMapping(m => ({ ...m, [i]: e.target.value as FieldKey }))}
                                className={inputCls}
                              >
                                {FIELD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Preview */}
                  {rows.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2">Preview (first 3 rows)</p>
                      <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="text-xs w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              {headers.map((h, i) => (
                                <th key={i} className={`px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap ${mapping[i] === 'skip' ? 'opacity-40' : ''}`}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {rows.slice(0, 3).map((row, ri) => (
                              <tr key={ri}>
                                {row.map((cell, ci) => (
                                  <td key={ci} className={`px-3 py-2 text-gray-600 max-w-[140px] truncate ${mapping[ci] === 'skip' ? 'opacity-40' : ''}`}>{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP: Importing */}
              {step === 'importing' && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-600">Importing {rows.length} leads…</p>
                </div>
              )}

              {/* STEP: Done */}
              {step === 'done' && result && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <CheckCircle2 size={22} className="text-green-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">{result.imported} leads imported successfully</p>
                      {result.skipped > 0 && <p className="text-xs text-green-600">{result.skipped} rows skipped</p>}
                    </div>
                  </div>
                  {result.errors.length > 0 && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle size={16} className="text-red-500" />
                        <p className="text-xs font-semibold text-red-700">Some errors occurred</p>
                      </div>
                      {result.errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <button onClick={() => { setOpen(false); reset() }} className="text-sm text-gray-500 hover:text-gray-700">
                {step === 'done' ? 'Close' : 'Cancel'}
              </button>
              {step === 'map' && (
                <button
                  onClick={doImport}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Import {rows.length} Leads
                </button>
              )}
              {step === 'done' && (
                <button
                  onClick={() => { reset() }}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Import Another File
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
