const fs = require('fs')
const path =
  'C:/Users/Administrator/.cursor/projects/d-1/agent-transcripts/5f85f297-3103-43a8-a7a4-f6f5ef77a241/5f85f297-3103-43a8-a7a4-f6f5ef77a241.jsonl'
const lines = fs.readFileSync(path, 'utf8').split('\n')
for (let i = 0; i < lines.length; i++) {
  const l = lines[i]
  if (!l.includes('jumpToPlotFloor')) continue
  try {
    const j = JSON.parse(l)
    for (const c of j.message?.content || []) {
      if (c.type === 'tool_use' && c.name === 'StrReplace' && c.input?.new_string?.includes('jumpToPlotFloor')) {
        fs.writeFileSync('scripts/_extracted-jump.txt', c.input.new_string, 'utf8')
        console.log('found jump, len', c.input.new_string.length)
      }
    }
  } catch {}
}
for (let i = 0; i < lines.length; i++) {
  const l = lines[i]
  if (!l.includes('DatingStoryComposerScaffold')) continue
  try {
    const j = JSON.parse(l)
    for (const c of j.message?.content || []) {
      if (c.type === 'tool_use' && c.name === 'StrReplace' && c.input?.new_string?.includes('DatingStoryComposerScaffold')) {
        fs.writeFileSync('scripts/_extracted-scaffold-usage.txt', c.input.new_string, 'utf8')
        console.log('found scaffold, len', c.input.new_string.length)
      }
    }
  } catch {}
}
