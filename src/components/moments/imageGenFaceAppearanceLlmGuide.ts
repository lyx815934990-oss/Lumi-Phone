/** 聊天 LLM 写 `发图` / `[图片]` 右侧 tag 时：露脸外貌与神态引导（不进生图 API，仅 system 注入） */

export type ImageGenFaceAppearanceLlmGuideOptions = {
  /** 无参考图时从角色档案提取的外貌 DNA */
  appearanceHint?: string
  characterGender?: 'male' | 'female' | null
}

export const IMAGE_GEN_FACE_APPEARANCE_FORBIDDEN_TAGS_HINT =
  'tired eyes, exhausted look, weary gaze, sleepy eyes, half-lidded sleepy gaze, dark circles, dark undereye circles, sickly pale, haggard, bedroom-eyes, melancholic, drained expression'

export function buildImageGenFaceAppearanceLlmBlock(
  options: ImageGenFaceAppearanceLlmGuideOptions = {},
): string {
  const hint = options.appearanceHint?.trim()
  const dnaLine = hint
    ? `\n- **角色外貌 DNA（无参考图·须择优写入右侧）**：${hint}`
    : ''
  const genderLine =
    options.characterGender === 'male'
      ? '\n- **男生露脸**：按人设写 **4～8 个**可见外貌 tag（脸型、下颌、眉、眼、鼻、唇、肤质、发色/刘海）；可写 sharp v-shaped jawline, slim face, messy dark hair, straight nose bridge, full natural lips, fair smooth skin 等；**禁止**套写 extremely handsome 固定串；**禁止** tired/dark circles 等疲态词。'
      : options.characterGender === 'female'
        ? '\n- **女生露脸**：按人设写 **4～8 个**可见 tag（如 soft oval face, long dark hair, clear eyes, healthy skin）；勿套模板。'
        : ''

  return `■ 露脸·外貌 tag（仅脸清晰可见时）
- **何时写**：自拍/对镜/upper body 露脸/close-up face/正侧脸入镜 → 右侧除 1boy/1girl 或 reference character 外，再写 **4～8 个**贴合人设的英文外貌 tag（脸型、下颌线、眉、眼、鼻、唇、肤质、发色/刘海状态等）。
- **何时不写**：空镜/风景/静物、无脸部位特写（手/锁骨/腹肌/腿等）→ **禁止** face/portrait/handsome/young man 等脸 tag。
- **写法顺序**：景别/机位 → 主体(1boy/1girl/reference character) → **外貌块(4～8 tag)** → 姿态/穿搭 → 环境/光线。
- **男生清瘦日系/花美男颜（参考·勿照搬）**：sharp v-shaped jawline, slim face, messy damp black hair strands over forehead, deep brown eyes, straight high nose bridge, full natural lips, fair smooth skin, healthy complexion, quiet relaxed expression。
- **肤质神态默认（硬性）**：日常用 healthy clear skin, even complexion, natural catchlights；**禁止** ${IMAGE_GEN_FACE_APPEARANCE_FORBIDDEN_TAGS_HINT}（除非剧情明确通宵/大病/刚哭过）。
- **有参考图**：用 reference character，**勿**写死脸型/发色/瞳色；可补当轮可见神态（lips slightly parted, light blush 等）。
${dnaLine}${genderLine}
- **例（男生·床上仰拍·清瘦颜·勿照搬）**：\`发图 躺在床上仰拍，乱发搭额前，锁骨露着，白被子盖到胸口|||[wx-selfie|who={{char}}] selfie shot, high angle from above, upper body, 1boy, sharp v-shaped jawline, slim face, messy damp black hair over forehead, deep brown eyes, straight nose bridge, full natural lips, fair smooth skin, healthy complexion, shirtless, collarbones visible, lying on back, white duvet to chest, dark grey pillow, soft side light, intimate bedroom\`
- **例（男生·半身自拍·勿照搬）**：\`发图 卧室自拍半身|||[wx-selfie|who={{char}}] selfie shot, upper body, 1boy, sharp jawline, dark short hair, clear brown eyes, healthy skin, grey t-shirt, dim bedroom lamp\`
- **例（女生·怼脸·勿照搬）**：\`发图 怼脸自拍特写|||[wx-selfie|who={{char}}] selfie shot, close-up face, 1girl, soft oval face, clear eyes, healthy skin, lips slightly parted, light blush on cheeks, warm lamp light\``.trim()
}
