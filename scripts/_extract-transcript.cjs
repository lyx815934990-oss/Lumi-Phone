const fs = require('fs')
const path =
  'C:/Users/Administrator/.cursor/projects/d-1/agent-transcripts/5f85f297-3103-43a8-a7a4-f6f5ef77a241/5f85f297-3103-43a8-a7a4-f6f5ef77a241.jsonl'
const lines = fs.readFileSync(path, 'utf8').split('\n')
for (const l of lines) {
  if (!l.includes('ds-story-topbar')) continue
  const j = JSON.parse(l)
  for (const c of j.message.content) {
    if (c.type !== 'tool_use' || c.name !== 'StrReplace') continue
    const input = c.input
    if (input?.new_string?.includes('ds-story-topbar')) {
      fs.writeFileSync('scripts/_extracted-layout.txt', input.new_string, 'utf8')
      console.log('Wrote layout, len', input.new_string.length)
    }
    if (input?.new_string?.includes('patchStoryAppearance')) {
      fs.writeFileSync('scripts/_extracted-state.txt', input.new_string, 'utf8')
      console.log('Wrote state, len', input.new_string.length)
    }
  }
}
