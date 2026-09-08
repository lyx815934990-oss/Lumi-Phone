const fs = require('fs')
const path =
  'C:/Users/Administrator/.cursor/projects/d-1/agent-transcripts/5f85f297-3103-43a8-a7a4-f6f5ef77a241/5f85f297-3103-43a8-a7a4-f6f5ef77a241.jsonl'
const lines = fs.readFileSync(path, 'utf8').split('\n')
const out = []
for (const l of lines) {
  if (!l.includes('floorJumpItems') && !l.includes('DatingStoryComposerScaffold') && !l.includes('composerCollapsed') && !l.includes('storyShellStyle')) continue
  try {
    const j = JSON.parse(l)
    for (const c of j.message?.content || []) {
      if (c.type === 'tool_use' && c.name === 'StrReplace' && c.input?.new_string) {
        const s = c.input.new_string
        if (
          s.includes('floorJumpItems') ||
          s.includes('DatingStoryComposerScaffold') ||
          s.includes('composerCollapsed') ||
          s.includes('storyShellStyle') ||
          s.includes('jumpToPlotFloor')
        ) {
          out.push('=== OLD: ' + (c.input.old_string || '').slice(0, 80) + '\n' + s)
        }
      }
    }
  } catch {}
}
fs.writeFileSync('scripts/_extracted-state2.txt', out.join('\n\n'), 'utf8')
console.log('blocks', out.length)
