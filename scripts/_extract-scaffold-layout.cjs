const fs = require('fs')
const path =
  'C:/Users/Administrator/.cursor/projects/d-1/agent-transcripts/5f85f297-3103-43a8-a7a4-f6f5ef77a241/5f85f297-3103-43a8-a7a4-f6f5ef77a241.jsonl'
const lines = fs.readFileSync(path, 'utf8').split('\n')
for (const l of lines) {
  if (!l.includes('DatingStoryComposerScaffold')) continue
  try {
    const j = JSON.parse(l)
    for (const c of j.message?.content || []) {
      if (c.type === 'tool_use' && c.name === 'StrReplace') {
        const s = c.input?.new_string || ''
        if (s.includes('DatingStoryComposerScaffold')) {
          fs.appendFileSync('scripts/_scaffold-layout.txt', s + '\n\n---END---\n\n', 'utf8')
        }
      }
    }
  } catch {}
}
