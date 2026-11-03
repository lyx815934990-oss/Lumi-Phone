import fs from 'fs'
import path from 'path'

const root = path.resolve('src/phone/apps/langStudy/wordbooks')
const rawDir = path.join(root, 'raw')
const outDir = path.join(root, 'data')
fs.mkdirSync(outDir, { recursive: true })

const zhDict = JSON.parse(fs.readFileSync(path.join(rawDir, 'ja-zh-final.json'), 'utf8'))

function cleanZh(s) {
  if (!s || typeof s !== 'string') return ''
  return s
    .replace(/^（[^）]*）/, '')
    .replace(/^[0-9⓪①②③④⑤⑥⑦⑧⑨]+/, '')
    .replace(/【[^】]*】/g, '')
    .replace(/^[0-9⓪①②③④⑤⑥⑦⑧⑨]+/, '')
    .trim()
    .replace(/^；+/, '')
    .trim()
}

function lookupZh(word, reading) {
  const direct = zhDict[word]
  if (typeof direct === 'string' && direct.trim()) return cleanZh(direct) || direct
  if (reading && typeof zhDict[reading] === 'string') {
    return cleanZh(zhDict[reading]) || zhDict[reading]
  }
  return ''
}

function convert(list, prefix) {
  let hit = 0
  const out = list.map((row, i) => {
    const zh = lookupZh(row.word, row.reading)
    const en = (row.meanings || []).join('；')
    if (zh) hit += 1
    const meaning = zh || en || '（释义待补）'
    const ex = row.examples?.[0]?.ja
    return {
      id: `${prefix}-${String(i + 1).padStart(4, '0')}`,
      word: row.word,
      phonetic: row.reading || undefined,
      meaning,
      ...(ex ? { example: ex } : {}),
    }
  })
  return { out, hit, total: list.length }
}

const n5 = JSON.parse(fs.readFileSync(path.join(rawDir, 'n5.json'), 'utf8'))
const n4 = JSON.parse(fs.readFileSync(path.join(rawDir, 'n4.json'), 'utf8'))

const a = convert(n5, 'n5')
const b = convert(n4, 'n4')
const both = [
  ...a.out,
  ...b.out.map((w, i) => ({
    ...w,
    id: `n54-${String(i + 1).padStart(4, '0')}`,
  })),
]

fs.writeFileSync(path.join(outDir, 'jlpt-n5.json'), JSON.stringify(a.out))
fs.writeFileSync(path.join(outDir, 'jlpt-n4.json'), JSON.stringify(b.out))
fs.writeFileSync(path.join(outDir, 'jlpt-n5n4.json'), JSON.stringify(both))
fs.writeFileSync(
  path.join(outDir, 'ATTRIBUTION.txt'),
  [
    'Vocabulary levels, headwords, readings, English glosses & examples: OpenJLPT (CC BY-SA 4.0)',
    'https://github.com/evanclan/OpenJLPT',
    'Chinese glosses matched from Japanese-Chinese-thesaurus',
    'https://github.com/lxl66566/Japanese-Chinese-thesaurus',
    '',
  ].join('\n'),
)

console.log({
  n5: a.total,
  n5Zh: a.hit,
  n4: b.total,
  n4Zh: b.hit,
  both: both.length,
  sample: a.out.find((x) => x.word === '食べる') || a.out[0],
})
