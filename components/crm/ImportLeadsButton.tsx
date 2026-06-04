'use client'

import { useState, useRef } from 'react'
import { Upload, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LEAD_SOURCES } from '@/lib/utils'
import { useCompanyId } from '@/hooks/useCompanyId'
import type { LeadStatus, LeadType } from '@/lib/types'

interface Props {
  agents: { id: string; full_name: string }[]
}

type FieldKey =
  | 'first_name' | 'last_name' | 'email' | 'phone'
  | 'address' | 'city' | 'state' | 'zip'
  | 'buying_address' | 'buying_city' | 'buying_state' | 'buying_zip'
  | 'selling_address' | 'selling_city' | 'selling_state' | 'selling_zip'
  | 'status' | 'lead_type' | 'lead_source' | 'pipeline_type'
  | 'assigned_agent_id' | 'deal_value' | 'reg_date' | 'note' | 'skip'

const FIELD_OPTIONS: { value: FieldKey; label: string }[] = [
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'address', label: 'Current Address' },
  { value: 'city', label: 'Current City' },
  { value: 'state', label: 'Current State' },
  { value: 'zip', label: 'Current Zip' },
  { value: 'buying_address', label: 'Buying Address' },
  { value: 'buying_city', label: 'Buying City' },
  { value: 'buying_state', label: 'Buying State' },
  { value: 'buying_zip', label: 'Buying Zip' },
  { value: 'selling_address', label: 'Selling Address' },
  { value: 'selling_city', label: 'Selling City' },
  { value: 'selling_state', label: 'Selling State' },
  { value: 'selling_zip', label: 'Selling Zip' },
  { value: 'status', label: 'Status / Pipeline' },
  { value: 'lead_type', label: 'Lead Type' },
  { value: 'lead_source', label: 'Lead Source' },
  { value: 'pipeline_type', label: 'Pipeline Type' },
  { value: 'assigned_agent_id', label: 'Agent' },
  { value: 'deal_value', label: 'Deal Value' },
  { value: 'reg_date', label: 'Added Date (Reg Date)' },
  { value: 'note', label: 'Note (import as note)' },
  { value: 'skip', label: '— Skip —' },
]

function norm(s: string) { return s.toLowerCase().replace(/[\s_()\-]+/g, '') }

function autoMap(header: string): FieldKey {
  const h = norm(header)
  // Lofty exact matches first
  if (h === 'firstname') return 'first_name'
  if (h === 'lastname') return 'last_name'
  if (h === 'primaryemail') return 'email'
  if (h === 'primaryphone') return 'phone'
  if (h === 'leadtype' || h === 'contacttype') return 'lead_type'
  if (h === 'pipeline' || h === 'segment' || h === 'leadstatus') return 'status'
  if (h === 'source' || h === 'leadsource') return 'lead_source'
  if (h === 'owner' || h === 'assignedagent') return 'assigned_agent_id'
  // Mailing / current address
  if (h.includes('mailingaddress') && h.includes('street')) return 'address'
  if (h.includes('mailingaddress') && h.includes('city')) return 'city'
  if (h.includes('mailingaddress') && (h.includes('province') || h.includes('state'))) return 'state'
  if (h.includes('mailingaddress') && (h.includes('postal') || h.includes('zip'))) return 'zip'
  // Buying property
  if (h.includes('buyingproperty') && h.includes('street')) return 'buying_address'
  if (h.includes('buyingproperty') && h.includes('city')) return 'buying_city'
  if (h.includes('buyingproperty') && (h.includes('province') || h.includes('state'))) return 'buying_state'
  if (h.includes('buyingproperty') && (h.includes('postal') || h.includes('zip'))) return 'buying_zip'
  // Selling property
  if (h.includes('sellingproperty') && h.includes('street')) return 'selling_address'
  if (h.includes('sellingproperty') && h.includes('city')) return 'selling_city'
  if (h.includes('sellingproperty') && (h.includes('province') || h.includes('state'))) return 'selling_state'
  if (h.includes('sellingproperty') && (h.includes('postal') || h.includes('zip'))) return 'selling_zip'
  // Notes
  if (h === 'regdate' || h === 'registrationdate' || h === 'addeddate' || h === 'createddate') return 'reg_date'
  if (/^note\d*$/.test(h)) return 'note'
  // Generic fallbacks
  if (h.includes('email')) return 'email'
  if (h.includes('phone') || h.includes('mobile') || h.includes('cell')) return 'phone'
  if (h.includes('firstname') || h === 'first') return 'first_name'
  if (h.includes('lastname') || h === 'last') return 'last_name'
  if ((h.includes('address') || h.includes('street')) && !h.includes('city') && !h.includes('state') && !h.includes('province') && !h.includes('postal') && !h.includes('zip')) return 'address'
  if (h.includes('city') && !h.includes('buying') && !h.includes('selling')) return 'city'
  if ((h.includes('state') || h.includes('province')) && !h.includes('buying') && !h.includes('selling')) return 'state'
  if ((h.includes('zip') || h.includes('postal')) && !h.includes('buying') && !h.includes('selling')) return 'zip'
  if (h.includes('pipeline') || h.includes('status')) return 'status'
  if (h.includes('price') || h.includes('value')) return 'deal_value'
  return 'skip'
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/)
  if (!lines.length) return { headers: [], rows: [] }
  function parseLine(line: string): string[] {
    const result: string[] = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++ } else inQ = !inQ }
      else if (c === ',' && !inQ) { result.push(cur.trim()); cur = '' }
      else cur += c
    }
    result.push(cur.trim())
    return result
  }
  return { headers: parseLine(lines[0]), rows: lines.slice(1).map(parseLine) }
}

// Strip Lofty backtick prefix from IDs and clean values
function clean(v: string) { return v.replace(/^`/, '').trim() }

function normalizeStatus(val: string): LeadStatus {
  const v = val.toLowerCase()
  if (v.includes('nurtur') || v.includes('cold') || v.includes('long')) return 'Nurture'
  if (v.includes('new')) return 'New'
  if (v.includes('attempt') || v.includes('contact')) return 'Attempting Contact'
  if (v.includes('active')) return 'Active'
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
  if (v.includes('zillow')) return 'Zillow'
  if (v.includes('call') || v.includes('inbound')) return 'Call In'
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
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()
  const companyId = useCompanyId()

  function reset() { setStep('upload'); setHeaders([]); setRows([]); setMapping({}); setResult(null); setProgress(0) }

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const { headers: h, rows: r } = parseCSV(text)
      if (!h.length) return
      setHeaders(h)
      setRows(r.filter(row => row.some(c => c.trim())))
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
    let imported = 0
    const errors: string[] = []
    const validRows = rows.filter(r => r.some(c => c.trim()))

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i]
      setProgress(Math.round((i / validRows.length) * 100))

      // Build lead record
      const rec: Record<string, unknown> = {
        status: 'New' as LeadStatus,
        lead_type: 'Buyer' as LeadType,
        pipeline_type: 'personal',
        company_id: companyId,
      }
      const noteTexts: string[] = []

      Object.entries(mapping).forEach(([colIdx, field]) => {
        const val = clean(row[Number(colIdx)] ?? '')
        if (!val) return
        if (field === 'skip') return
        if (field === 'note') { noteTexts.push(val); return }
        if (field === 'reg_date') {
          const parsed = new Date(val)
          if (!isNaN(parsed.getTime())) rec.created_at = parsed.toISOString()
          return
        }
        if (field === 'status') rec.status = normalizeStatus(val)
        else if (field === 'lead_type') rec.lead_type = normalizeLeadType(val)
        else if (field === 'lead_source') rec.lead_source = normalizeSource(val)
        else if (field === 'pipeline_type') rec.pipeline_type = val.toLowerCase().includes('company') ? 'company' : 'personal'
        else if (field === 'deal_value') rec.deal_value = parseFloat(val.replace(/[^0-9.]/g, '')) || null
        else if (field === 'assigned_agent_id') {
          // Match by email (Lofty format: "Name(email@...)")
          const emailMatch = val.match(/\(([^)]+)\)/)
          const email = emailMatch ? emailMatch[1] : val
          const byEmail = agents.find(a => (a as unknown as { email?: string }).email === email)
          const byName = agents.find(a => a.full_name.toLowerCase().includes(val.toLowerCase().split('(')[0].trim()))
          if (byEmail) rec.assigned_agent_id = byEmail.id
          else if (byName) rec.assigned_agent_id = byName.id
        }
        else rec[field] = val
      })

      // Ensure a name exists
      if (!rec.first_name) rec.first_name = `Lead ${i + 1}`
      if (!rec.last_name) rec.last_name = ''

      // Insert lead
      const { data: inserted, error } = await supabase
        .from('leads')
        .insert(rec)
        .select('id')
        .single()

      if (error) { errors.push(`Row ${i + 1} (${rec.first_name} ${rec.last_name}): ${error.message}`); continue }
      imported++

      // Insert notes
      if (inserted && noteTexts.length > 0) {
        const noteInserts = noteTexts
          .filter(t => t.trim())
          .map(content => ({
            lead_id: inserted.id,
            content,
            author_id: user?.id,
            note_type: 'note',
            company_id: companyId,
          }))
        if (noteInserts.length) await supabase.from('lead_notes').insert(noteInserts)
      }
    }

    setProgress(100)
    setResult({ imported, errors })
    setStep('done')
    router.refresh()
  }

  // Group headers for display: show mapped field label
  const fieldLabel = (key: FieldKey) => FIELD_OPTIONS.find(o => o.value === key)?.label ?? key
  const inputCls = 'border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-full'

  // Only show non-skip columns in mapping table
  const mappedCount = Object.values(mapping).filter(v => v !== 'skip').length

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
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Import Leads from CSV</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {step === 'upload' && 'Supports Lofty, Follow Up Boss, kvCORE, and any CSV export'}
                  {step === 'map' && `${rows.length} rows · ${mappedCount} columns mapped`}
                  {step === 'importing' && `Importing… ${progress}%`}
                  {step === 'done' && 'Import complete'}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
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
                  <p className="text-xs text-gray-400 mt-1">Lofty exports are fully supported — addresses, notes, pipeline status all mapped automatically</p>
                  <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                </div>
              )}

              {step === 'map' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500">We auto-detected column mappings from your Lofty export. Adjust any that look wrong.</p>
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
                            <td className="px-4 py-2 text-gray-700 font-medium truncate max-w-[200px]">{col}</td>
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

                  {rows.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2">Preview (first 3 rows)</p>
                      <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="text-xs w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              {headers.map((h, i) => (
                                <th key={i} className={`px-3 py-2 text-left font-medium whitespace-nowrap ${mapping[i] === 'skip' ? 'text-gray-300' : 'text-gray-500'}`}>
                                  {mapping[i] !== 'skip' ? fieldLabel(mapping[i]) : h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {rows.slice(0, 3).map((row, ri) => (
                              <tr key={ri}>
                                {row.map((cell, ci) => (
                                  <td key={ci} className={`px-3 py-2 max-w-[160px] truncate ${mapping[ci] === 'skip' ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {clean(cell)}
                                  </td>
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

              {step === 'importing' && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-sm text-gray-600">Importing {rows.length} leads… {progress}%</p>
                </div>
              )}

              {step === 'done' && result && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <CheckCircle2 size={22} className="text-green-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">{result.imported} leads imported successfully</p>
                    </div>
                  </div>
                  {result.errors.length > 0 && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle size={16} className="text-red-500" />
                        <p className="text-xs font-semibold text-red-700">{result.errors.length} rows failed</p>
                      </div>
                      {result.errors.slice(0, 5).map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
                      {result.errors.length > 5 && <p className="text-xs text-red-400">…and {result.errors.length - 5} more</p>}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <button onClick={() => { setOpen(false); reset() }} className="text-sm text-gray-500 hover:text-gray-700">
                {step === 'done' ? 'Close' : 'Cancel'}
              </button>
              {step === 'map' && (
                <button onClick={doImport} className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                  Import {rows.length} Leads
                </button>
              )}
              {step === 'done' && (
                <button onClick={reset} className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
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
