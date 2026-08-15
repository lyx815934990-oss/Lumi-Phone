import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ConsultCaseChart, ConsultSession, HealthProfile } from '../types'

function dateBits(label: string, index: number): { day: string; sub: string } {
  const m = label.match(/(\d{1,2})\s*[月/.-]\s*(\d{1,2})/)
  if (m) return { day: m[2]!.padStart(2, '0'), sub: `${m[1]}月` }
  const d = label.match(/(\d{1,2})\s*日/)
  if (d) return { day: d[1]!.padStart(2, '0'), sub: '日' }
  if (/今天|今日/.test(label)) return { day: '今', sub: '天' }
  if (/昨天|昨日/.test(label)) return { day: '昨', sub: '天' }
  return { day: String(index + 1).padStart(2, '0'), sub: '次' }
}

/** 旧数据无 chart 时，从对白软合成一份可读病案单 */
function resolveChart(
  consult: ConsultSession,
  profile?: HealthProfile,
): ConsultCaseChart {
  const c = consult.chart
  const patientLines = (consult.turns ?? [])
    .filter((t) => t.speaker === 'patient')
    .map((t) => t.text.trim())
    .filter(Boolean)
    .slice(0, 8)

  const ageBody =
    c?.ageBody?.trim() ||
    [profile?.age, profile?.bmi ? `BMI ${profile.bmi}` : ''].filter(Boolean).join('，') ||
    undefined

  return {
    gender: c?.gender?.trim() || undefined,
    ageBody,
    reason: c?.reason?.trim() || consult.topic,
    inquiry: c?.inquiry?.length ? c.inquiry : patientLines.length ? patientLines : undefined,
    pulse: c?.pulse?.trim() || undefined,
    inspection: c?.inspection?.trim() || undefined,
    tongue: c?.tongue?.trim() || undefined,
    diagnosis: c?.diagnosis?.trim() || undefined,
    rxTitle: c?.rxTitle?.trim() || undefined,
    rxLines: c?.rxLines?.length ? c.rxLines : undefined,
    prepNote: c?.prepNote?.trim() || undefined,
    explanation: c?.explanation?.trim() || undefined,
    remark: c?.remark?.trim() || undefined,
  }
}

function doctorSheetTitle(doctor?: string): string {
  const d = doctor?.trim()
  if (!d) return '面诊病案纪录'
  const short = d.replace(/医生|医师|大夫/g, '').trim() || d
  return `${short}医师病案纪录`
}

export function ConsultsScreen({
  consults,
  onOpen,
}: {
  consults: ConsultSession[]
  onOpen: (id: string) => void
}) {
  if (!consults.length) return <div className="health-empty">暂无面诊记录</div>
  return (
    <div className="px-4 pb-10 pt-1">
      <p className="mb-3 text-[12px] leading-relaxed" style={{ color: '#8b8b8f' }}>
        门诊病案记录单与当面问诊笔录，可点开查看。
      </p>
      <div className="health-visit-list">
        {consults.map((c, i) => {
          const bits = dateBits(c.consultedAtLabel, i)
          const preview =
            c.chart?.reason ||
            c.chart?.diagnosis ||
            c.turns.find((t) => t.speaker === 'patient')?.text ||
            c.topic
          return (
            <button key={c.id} type="button" className="health-visit-card" onClick={() => onOpen(c.id)}>
              <div className="health-visit-date">
                <span className="hl-num">{bits.day}</span>
                <small>{bits.sub}</small>
              </div>
              <div className="health-visit-main">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-semibold">{c.topic}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="health-dept-tag">{c.department}</span>
                      <span className="hl-num text-[11px]" style={{ color: '#8b8b8f' }}>
                        {c.consultedAtLabel}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="mt-0.5 shrink-0" style={{ color: '#8b8b8f' }} />
                </div>
                <div className="mt-2.5 line-clamp-2 text-[12px] leading-relaxed" style={{ color: '#5A6B7A' }}>
                  {c.doctor ? `${c.doctor} · ` : ''}
                  {preview}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SheetBlock({
  label,
  en,
  children,
  tone,
}: {
  label: string
  en?: string
  children: ReactNode
  tone?: 'ink' | 'accent'
}) {
  return (
    <section className={`health-case-sheet-block${tone === 'accent' ? ' is-accent' : ''}`}>
      <header className="health-case-sheet-block-h">
        <strong>{label}</strong>
        {en ? <span className="hl-en">{en}</span> : null}
      </header>
      <div className="health-case-sheet-block-b">{children}</div>
    </section>
  )
}

export function ConsultDetailScreen({
  consult,
  patientLabel,
  profile,
}: {
  consult: ConsultSession
  /** 通讯录备注 / 真实姓名，用于「患」侧与病案姓名 */
  patientLabel?: string
  profile?: HealthProfile
}) {
  const patient = patientLabel?.trim() || '患者'
  const doctor = consult.doctor?.trim() || '医师'
  const chart = resolveChart(consult, profile)
  const turns = (consult.turns ?? []).filter((t) => {
    const text = t.text?.trim()
    if (!text) return false
    if (doctor && text === doctor) return false
    return true
  })

  const metaCells = [
    { k: '姓名', v: patient },
    { k: '性别', v: chart.gender || '—' },
    { k: '年龄及体型', v: chart.ageBody || profile?.age || '—' },
    { k: '来诊日期', v: consult.consultedAtLabel },
  ]

  const hasExam = !!(chart.pulse || chart.inspection || chart.tongue)
  const hasRx = !!(chart.rxLines?.length || chart.rxTitle || chart.prepNote)

  return (
    <div className="px-4 pb-12 pt-2">
      <article className="health-case-sheet">
        <div className="health-case-sheet-ornament" aria-hidden />
        <header className="health-case-sheet-title">
          <div className="hl-en health-case-sheet-kicker">Outpatient case chart</div>
          <h1>{doctorSheetTitle(consult.doctor)}</h1>
          <p>
            {consult.hospital}
            <span aria-hidden> · </span>
            {consult.department}
          </p>
        </header>

        <div className="health-case-sheet-meta">
          {metaCells.map((cell) => (
            <div key={cell.k} className="health-case-sheet-meta-cell">
              <span>{cell.k}</span>
              <strong className={cell.k === '来诊日期' ? 'hl-num' : undefined}>{cell.v}</strong>
            </div>
          ))}
        </div>

        <SheetBlock label="来诊原因" en="Chief complaint">
          <p className="health-case-sheet-prose">{chart.reason || consult.topic}</p>
        </SheetBlock>

        {chart.inquiry?.length ? (
          <SheetBlock label="问诊" en="Inquiry">
            <ol className="health-case-sheet-ol">
              {chart.inquiry.map((item, i) => (
                <li key={`${consult.id}-q-${i}`}>
                  <span className="hl-num">{String(i + 1).padStart(2, '0')}</span>
                  <p>{item}</p>
                </li>
              ))}
            </ol>
          </SheetBlock>
        ) : null}

        {hasExam ? (
          <SheetBlock label="脉诊 · 望诊" en="Pulse & inspection">
            <div className="health-case-sheet-exam">
              {chart.pulse ? (
                <div>
                  <em>脉诊</em>
                  <p>{chart.pulse}</p>
                </div>
              ) : null}
              {chart.inspection ? (
                <div>
                  <em>望诊</em>
                  <p>{chart.inspection}</p>
                </div>
              ) : null}
              {chart.tongue ? (
                <div>
                  <em>舌诊</em>
                  <p>{chart.tongue}</p>
                </div>
              ) : null}
            </div>
          </SheetBlock>
        ) : null}

        {chart.diagnosis ? (
          <SheetBlock label="诊断" en="Diagnosis" tone="accent">
            <p className="health-case-sheet-prose health-case-sheet-dx">{chart.diagnosis}</p>
          </SheetBlock>
        ) : null}

        {hasRx ? (
          <SheetBlock label="处方" en="Prescription">
            {chart.rxTitle ? <div className="health-case-sheet-rx-title">{chart.rxTitle}</div> : null}
            {chart.rxLines?.length ? (
              <ul className="health-case-sheet-rx">
                {chart.rxLines.map((line, i) => (
                  <li key={`${consult.id}-rx-${i}`}>
                    <span>{line.text}</span>
                    {line.note ? <em>{line.note}</em> : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {chart.prepNote ? <p className="health-case-sheet-prep">{chart.prepNote}</p> : null}
          </SheetBlock>
        ) : null}

        {chart.explanation ? (
          <SheetBlock label="解说" en="Notes">
            <p className="health-case-sheet-prose">{chart.explanation}</p>
          </SheetBlock>
        ) : null}

        {chart.remark ? (
          <SheetBlock label="备注" en="Remark">
            <p className="health-case-sheet-prose">{chart.remark}</p>
          </SheetBlock>
        ) : null}

        <footer className="health-case-sheet-foot">
          <span className="hl-en">For review only · not a real medical record</span>
        </footer>
      </article>

      <div className="health-section-label">
        <span>问诊笔录</span>
      </div>
      <div className="health-chart">
        <div className="health-chart-head">
          <strong>当面问诊原文</strong>
          <span>Transcript</span>
        </div>
        <div className="health-consult-pad">
          {turns.length ? (
            turns.map((t, i) => {
              const isPatient = t.speaker === 'patient'
              return (
                <div
                  key={`${consult.id}-${i}`}
                  className={`health-consult-turn ${isPatient ? 'is-patient' : 'is-doctor'}`}
                >
                  <div className="health-consult-who">
                    <span className="health-consult-badge">{isPatient ? '患' : '医'}</span>
                    <span className="health-consult-name">{isPatient ? patient : doctor}</span>
                  </div>
                  <p className="health-consult-text">{t.text}</p>
                </div>
              )
            })
          ) : (
            <div className="py-6 text-center text-[13px]" style={{ color: '#8b8b8f' }}>
              暂无问诊对话内容
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
