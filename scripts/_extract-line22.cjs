const fs = require('fs')
const path =
  'C:/Users/Administrator/.cursor/projects/d-1/agent-transcripts/5f85f297-3103-43a8-a7a4-f6f5ef77a241/5f85f297-3103-43a8-a7a4-f6f5ef77a241.jsonl'
const lines = fs.readFileSync(path, 'utf8').split('\n')
const line22 = lines[21]
const j = JSON.parse(line22)
for (const c of j.message.content) {
  if (c.type === 'tool_use' && c.name === 'StrReplace') {
    const s = c.input.new_string
    if (s.includes('floorJump') || s.includes('jumpToPlot') || s.includes('paletteOpen') || s.includes('patchStoryAppearance') || s.includes('setCommentModeEnabled') || s.includes('DatingStoryComposerScaffold')) {
      fs.appendFileSync('scripts/_line22-patches.txt', `\n\n=====\n${s}\n`, 'utf8')
      console.log('patch len', s.length, s.slice(0, 60))
    }
  }
}
