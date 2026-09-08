const fs = require('fs')
const path =
  'C:/Users/Administrator/.cursor/projects/d-1/agent-transcripts/f95de6ef-8cad-49e4-a211-bb116121c52b/f95de6ef-8cad-49e4-a211-bb116121c52b.jsonl'
const lines = fs.readFileSync(path, 'utf8').split('\n')
for (const l of lines) {
  if (!l.includes('floorJumpItems = useMemo')) continue
  const j = JSON.parse(l)
  for (const c of j.message.content) {
    if (c.type === 'tool_use' && c.name === 'StrReplace' && c.input.new_string.includes('floorJumpItems')) {
      fs.writeFileSync('scripts/_floor-jump.txt', c.input.new_string, 'utf8')
      console.log('len', c.input.new_string.length)
    }
  }
}
