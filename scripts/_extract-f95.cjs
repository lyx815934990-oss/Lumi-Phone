const fs = require('fs')
const path =
  'C:/Users/Administrator/.cursor/projects/d-1/agent-transcripts/f95de6ef-8cad-49e4-a211-bb116121c52b/f95de6ef-8cad-49e4-a211-bb116121c52b.jsonl'
const lines = fs.readFileSync(path, 'utf8').split('\n')
const keywords = ['floorJumpItems', 'DatingStoryComposerScaffold', 'DatingStoryComposerDock', 'composerCollapsed', 'handleNormalSend', 'ceremonyEnter', 'patchStoryAppearance', 'setCommentModeEnabled']
for (const l of lines) {
  if (!keywords.some((k) => l.includes(k))) continue
  try {
    const j = JSON.parse(l)
    for (const c of j.message?.content || []) {
      if (c.type !== 'tool_use' || c.name !== 'StrReplace') continue
      const s = c.input?.new_string || ''
      if (!keywords.some((k) => s.includes(k))) continue
      const tag = keywords.find((k) => s.includes(k))
      fs.appendFileSync('scripts/_extracted-f95.txt', `\n\n===== ${tag} =====\n${s}\n`, 'utf8')
    }
  } catch {}
}
console.log('done')
