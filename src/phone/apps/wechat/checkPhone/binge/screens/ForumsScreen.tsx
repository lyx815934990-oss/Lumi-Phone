import { ChevronRight, Users } from 'lucide-react'
import type { ForumGroup } from '../types'

export function ForumsScreen({
  forums,
  onOpen,
}: {
  forums: ForumGroup[]
  onOpen: (id: string) => void
}) {
  return (
    <div className="px-4 pb-10 pt-1">
      <div className="binge-sub-intro">
        <div className="binge-page-head" style={{ marginBottom: 0 }}>
          <div>
            <h2>讨论组</h2>
            <p className="binge-page-lead" style={{ marginBottom: 0, marginTop: 4 }}>
              角色关注或常逛的作品讨论组，点进看动态。
            </p>
          </div>
          <span className="binge-count-pill binge-num">{forums.length}</span>
        </div>
      </div>

      {!forums.length ? (
        <div className="binge-empty binge-empty--soft mt-3">暂无讨论组</div>
      ) : (
        <ul className="mt-3">
          {forums.map((f) => (
            <li key={f.id}>
              <button type="button" className="binge-forum-card" onClick={() => onOpen(f.id)}>
                <div className="binge-forum-cover" style={{ background: f.coverTone }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold leading-snug">{f.name}</div>
                  <div className="mt-1 truncate text-[12px]" style={{ color: '#8b8b8f' }}>
                    {f.relatedTitle}
                  </div>
                  <div className="binge-forum-meta">
                    <span className="binge-meta-chip binge-num inline-flex items-center gap-1">
                      <Users size={10} strokeWidth={1.8} aria-hidden />
                      {f.memberCount} 成员
                    </span>
                    <span className="binge-meta-chip">{f.activityLabel}</span>
                  </div>
                </div>
                <ChevronRight size={16} strokeWidth={1.6} style={{ color: '#8b8b8f' }} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ForumDetailScreen({ forum }: { forum: ForumGroup }) {
  return (
    <div className="px-4 pb-10 pt-1">
      <div className="binge-forum-hero">
        <div className="binge-forum-hero-wash" style={{ background: forum.coverTone }} />
        <div className="binge-forum-hero-body">
          <div className="binge-forum-cover" style={{ width: 64, height: 64, background: forum.coverTone }} />
          <div className="min-w-0 flex-1">
            <h1 className="text-[19px] font-semibold leading-snug tracking-tight">{forum.name}</h1>
            <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: '#5c5164' }}>
              {forum.bio}
            </p>
            <div className="binge-forum-meta" style={{ marginTop: 10 }}>
              <span className="binge-meta-chip binge-num">{forum.memberCount} 成员</span>
              <span className="binge-meta-chip">{forum.activityLabel}</span>
              <span className="binge-meta-chip">{forum.relatedTitle}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="binge-section-label">
        <span>最新动态</span>
      </div>

      {!forum.posts.length ? (
        <div className="binge-empty binge-empty--soft">暂无动态</div>
      ) : (
        forum.posts.map((p) => (
          <article key={p.id} className="binge-post-card">
            <div className="binge-post-nick">
              <span>{p.nick}</span>
              {p.isCharacter ? <span className="binge-char-dot" title="TA发的" /> : null}
              {p.isCharacter ? (
                <span className="text-[10px] font-medium" style={{ color: '#6B5A78' }}>
                  TA
                </span>
              ) : null}
            </div>
            <p className="binge-post-body">{p.body}</p>
            <div className="binge-post-foot binge-num">
              <span>{p.likes} 赞</span>
              <span>{p.replies} 回复</span>
              <span>{p.timeLabel}</span>
            </div>
          </article>
        ))
      )}
    </div>
  )
}
