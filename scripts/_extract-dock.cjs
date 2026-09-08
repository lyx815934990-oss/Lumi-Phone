const fs = require('fs')
const path =
  'C:/Users/Administrator/.cursor/projects/d-1/agent-transcripts/f95de6ef-8cad-49e4-a211-bb116121c52b/f95de6ef-8cad-49e4-a211-bb116121c52b.jsonl'
const lines = fs.readFileSync(path, 'utf8').split('\n')
const out = []
for (const l of lines) {
  if (!l.includes('DatingStoryComposerDock') && !l.includes('loadDatingComposerCollapsed')) continue
  try {
    const j = JSON.parse(l)
    for (const c of j.message?.content || []) {
      if (c.type === 'tool_use' && c.name === 'StrReplace' && c.input?.new_string) {
        out.push(c.input.new_string)
      }
    }
  } catch {}
}
fs.writeFileSync('scripts/_extracted-dock.txt', out.join('\n\n---\n\n'), 'utf8')
console.log('blocks', out.length)
