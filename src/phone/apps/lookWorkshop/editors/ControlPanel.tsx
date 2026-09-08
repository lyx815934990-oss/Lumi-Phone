import {
  ColorField,
  RangeField,
  TextField,
  ToggleField,
  SelectField,
  ImageUploadField,
  BgImageCropField,
  FontUploadField,
  Accordion,
  FieldGroup,
  PanelCategory,
} from '../controls/Fields'
import { createDefaultLookWorkshopDraft } from '../defaults'
import type {
  BubbleSideDraft,
  HeaderAvatarPlacement,
  HeaderBtnSide,
  InputBtnIconDraft,
  InputBtnIconKey,
  SpecialCardDraft,
} from '../types'
import { useLookWorkshopStore, flushLookWorkshopPersist } from '../store'
import {
  MAX_BUBBLE_EDGE_STICKERS_PER_SIDE,
  newBubbleEdgeStickerId,
  type BubbleEdge,
  type BubbleEdgeSticker,
} from '../../wechat/bubbleEdgeStickers'
import {
  MAX_AVATAR_STICKERS_PER_SIDE,
  MAX_AVATAR_STICKER_SIZE_PX,
  MIN_AVATAR_STICKER_SIZE_PX,
  newAvatarStickerId,
  readAvatarStickerFile,
  avatarStickerSourceUrl,
  isAvatarStickerGif,
  type AvatarSticker,
} from '../../wechat/avatarStickers'
import {
  clampBubbleFrameSlicesToImage,
  defaultBubbleFrame,
  defaultSliceFromImageSize,
  frameSourceUrl,
  readAndCompressBubbleFrame,
  type BubbleFrame,
  type BubbleFrameEdgeMode,
} from '../../wechat/bubbleFrame'
import {
  bakeChromaKeyDataUrl,
  CHROMA_COLOR_PRESETS,
  DEFAULT_CHROMA_KEY,
  normalizeChromaKey,
  pickColorWithEyeDropper,
  sampleCanvasHex,
  supportsEyeDropper,
  type ChromaKeyConfig,
} from '../../wechat/chromaKey'
import { useEffect, useRef, useState, type MouseEvent } from 'react'

const INPUT_BTN_ICON_ROWS: { key: InputBtnIconKey; label: string }[] = [
  { key: 'voice', label: '语音 / 麦克风' },
  { key: 'keyboard', label: '键盘（语音态 / 表情面板）' },
  { key: 'emoji', label: '表情' },
  { key: 'plus', label: '加号 / 更多' },
  { key: 'send', label: '发送' },
]

function syncBtnIconStyleToAll(
  icons: LookWorkshopDraftInputIcons,
  source: InputBtnIconDraft,
): LookWorkshopDraftInputIcons {
  const next = { ...icons }
  for (const row of INPUT_BTN_ICON_ROWS) {
    next[row.key] = {
      ...icons[row.key],
      sizePx: source.sizePx,
      radiusPx: source.radiusPx,
    }
  }
  return next
}

type LookWorkshopDraftInputIcons = {
  voice: InputBtnIconDraft
  keyboard: InputBtnIconDraft
  emoji: InputBtnIconDraft
  plus: InputBtnIconDraft
  send: InputBtnIconDraft
}

/** 不透明实色（#hex / rgb / 高 alpha rgba）——渐变开启时不应再当气泡/尖角底色 */
function isOpaqueSolidCssColor(color: string): boolean {
  const c = color.trim()
  if (!c) return false
  const rgba =
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(c)
  if (rgba) {
    if (rgba[4] == null || rgba[4] === '') return true
    const a = Number(rgba[4])
    return Number.isFinite(a) && a >= 0.92
  }
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(c)
  if (!hex) return false
  let h = hex[1]!
  if (h.length === 3) h = h.split('').map((ch) => ch + ch).join('')
  if (h.length === 8) return parseInt(h.slice(6, 8), 16) >= 235
  return true
}

function BubbleSideFields({
  prefix,
  side,
}: {
  prefix: 'other' | 'self'
  side: BubbleSideDraft
}) {
  const patchPath = useLookWorkshopStore((s) => s.patchPath)
  const p = (key: keyof BubbleSideDraft, v: unknown) => patchPath(`${prefix}.${key}`, v)
  const baseSide = createDefaultLookWorkshopDraft().other
  const glassEnabled = side.glassEnabled === true
  const glassBlurPx = Number.isFinite(side.glassBlurPx) ? side.glassBlurPx : baseSide.glassBlurPx
  const glassSaturatePct = Number.isFinite(side.glassSaturatePct)
    ? side.glassSaturatePct
    : baseSide.glassSaturatePct
  const gradientMode = side.gradientMode ?? 'off'
  const gradientStops =
    Array.isArray(side.gradientStops) && side.gradientStops.length >= 2
      ? side.gradientStops
      : baseSide.gradientStops
  const gradientAngleDeg = Number.isFinite(side.gradientAngleDeg)
    ? side.gradientAngleDeg
    : baseSide.gradientAngleDeg
  const shadowDraft = side.shadowDraft ?? baseSide.shadowDraft
  const badge = side.badge ?? baseSide.badge

  const patchShadow = (partial: Partial<BubbleSideDraft['shadowDraft']>) =>
    p('shadowDraft', { ...shadowDraft, ...partial })
  const patchBadge = (partial: Partial<BubbleSideDraft['badge']>) =>
    p('badge', { ...badge, ...partial })

  // 已开渐变但仍留着不透明纯色底时，清掉，避免尖角衔接渗出色块
  useEffect(() => {
    if (gradientMode !== 'off' && isOpaqueSolidCssColor(side.bg)) {
      p('bg', 'rgba(255,255,255,0.45)')
    }
    // 仅随侧别/渐变模式纠正，勿跟 bg 形成环
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefix, gradientMode])

  const patchStop = (index: number, partial: Partial<(typeof gradientStops)[number]>) => {
    const nextStops = gradientStops.map((s, i) => (i === index ? { ...s, ...partial } : s))
    p('gradientStops', nextStops)
  }
  const addStop = () => {
    if (gradientStops.length >= 5) return
    const last = gradientStops[gradientStops.length - 1]
    p('gradientStops', [
      ...gradientStops,
      { atPct: Math.min(100, (last?.atPct ?? 50) + 20), color: last?.color ?? '#ffffff' },
    ])
  }
  const removeStop = (index: number) => {
    if (gradientStops.length <= 2) return
    p(
      'gradientStops',
      gradientStops.filter((_, i) => i !== index),
    )
  }

  const applyLiquidGlassPreset = () => {
    p('bg', 'rgba(255,255,255,0.45)')
    p('glassEnabled', true)
    p('glassBlurPx', 16)
    p('glassSaturatePct', 140)
    p('glassEdgeBlurPx', 0)
    p('gradientMode', 'stops')
    p('useGradient', true)
    p('gradientAngleDeg', 135)
    p('gradientStops', [
      { atPct: 0, color: 'rgba(255,255,255,0.55)' },
      { atPct: 100, color: 'rgba(255,255,255,0.28)' },
    ])
    p('borderWidth', 0)
    p('borderColor', 'rgba(255,255,255,0.35)')
    p('shadowDraft', {
      enabled: true,
      useCss: false,
      angleDeg: 210,
      distancePx: 8,
      blurPx: 24,
      spreadPx: 0,
      color: 'rgba(0,0,0,0.10)',
    })
    p('radius', 22)
    p('padT', 12)
    p('padR', 16)
    p('padB', 12)
    p('padL', 16)
  }

  return (
    <div className="space-y-3">
      <FieldGroup
        title="液态玻璃"
        tone="accent"
        hint="半透明底色 + 透视壁纸。聊天室有背景图时效果更明显。"
        action={
          <button
            type="button"
            className="rounded-lg bg-sky-800 px-2.5 py-1 text-[10px] font-medium text-white"
            onClick={applyLiquidGlassPreset}
          >
            一键预设
          </button>
        }
      >
        <ColorField
          label={
            gradientMode !== 'off' ? '背景色（渐变开启时不参与填充）' : '背景色（建议半透明）'
          }
          value={side.bg}
          onChange={(v) => p('bg', v)}
        />
        <ToggleField
          label="开启毛玻璃"
          checked={glassEnabled}
          onChange={(v) => p('glassEnabled', v)}
        />
        {glassEnabled ? (
          <>
            <RangeField
              label="玻璃模糊"
              value={glassBlurPx}
              min={0}
              max={40}
              unit="px"
              onChange={(v) => p('glassBlurPx', v)}
            />
            <RangeField
              label="玻璃饱和"
              value={glassSaturatePct}
              min={100}
              max={200}
              unit="%"
              onChange={(v) => p('glassSaturatePct', v)}
            />
            <RangeField
              label="边缘模糊"
              value={Number.isFinite(side.glassEdgeBlurPx) ? side.glassEdgeBlurPx : 0}
              min={0}
              max={24}
              unit="px"
              onChange={(v) => p('glassEdgeBlurPx', v)}
            />
            <p className="text-[10px] leading-relaxed text-neutral-400">
              把气泡轮廓羽化（真正的边缘糊开），不是描边颜色。建议 6–14；0 为硬切边。
            </p>
          </>
        ) : null}
      </FieldGroup>

      <FieldGroup title="渐变填充" hint="纯色 / 色标 / 手写 CSS；开启后气泡条用渐变。尖角默认跟随，可在「气泡尖角」里单独改。">
        <SelectField
          label="渐变模式"
          value={gradientMode}
          options={[
            { value: 'off', label: '关闭（纯色）' },
            { value: 'stops', label: '色标编辑' },
            { value: 'css', label: '手写 CSS' },
          ]}
          onChange={(v) => {
            p('gradientMode', v)
            p('useGradient', v !== 'off')
            // 开启渐变时：若纯色底是不透明实色，自动换成中性半透明，避免尖角/垫色渗出色块
            if (v !== 'off' && isOpaqueSolidCssColor(side.bg)) {
              p('bg', 'rgba(255,255,255,0.45)')
            }
          }}
        />
        {gradientMode === 'stops' ? (
          <>
            <RangeField
              label="渐变角度"
              value={gradientAngleDeg}
              min={0}
              max={360}
              unit="°"
              onChange={(v) => p('gradientAngleDeg', v)}
            />
            {gradientStops.map((stop, i) => (
              <div key={i} className="space-y-1 rounded-lg border border-black/6 bg-white/70 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-neutral-500">色标 {i + 1}</span>
                  {gradientStops.length > 2 ? (
                    <button
                      type="button"
                      className="text-[10px] text-red-600/80"
                      onClick={() => removeStop(i)}
                    >
                      删除
                    </button>
                  ) : null}
                </div>
                <ColorField
                  label="颜色"
                  value={stop.color}
                  onChange={(v) => patchStop(i, { color: v })}
                />
                <RangeField
                  label="位置"
                  value={stop.atPct}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(v) => patchStop(i, { atPct: v })}
                />
              </div>
            ))}
            {gradientStops.length < 5 ? (
              <button type="button" className="lw-btn-ghost w-full text-[11px]" onClick={addStop}>
                添加色标
              </button>
            ) : null}
          </>
        ) : null}
        {gradientMode === 'css' ? (
          <TextField
            label="渐变 CSS"
            value={side.bgGradient}
            placeholder="linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.28))"
            onChange={(v) => p('bgGradient', v)}
          />
        ) : null}
      </FieldGroup>

      <FieldGroup title="阴影" hint="结构化滑块优先；需要时再切手写 box-shadow。">
        <ToggleField
          label="启用阴影"
          checked={shadowDraft.enabled}
          onChange={(v) => patchShadow({ enabled: v })}
        />
        {shadowDraft.enabled ? (
          <>
            <ToggleField
              label="手写 box-shadow"
              checked={shadowDraft.useCss}
              onChange={(v) => patchShadow({ useCss: v })}
            />
            {shadowDraft.useCss ? (
              <TextField label="阴影 CSS" value={side.shadow} onChange={(v) => p('shadow', v)} />
            ) : (
              <>
                <RangeField
                  label="发散角度"
                  value={shadowDraft.angleDeg}
                  min={0}
                  max={360}
                  unit="°"
                  onChange={(v) => patchShadow({ angleDeg: v })}
                />
                <RangeField
                  label="偏移距离"
                  value={shadowDraft.distancePx}
                  min={0}
                  max={40}
                  unit="px"
                  onChange={(v) => patchShadow({ distancePx: v })}
                />
                <RangeField
                  label="模糊发散"
                  value={shadowDraft.blurPx}
                  min={0}
                  max={60}
                  unit="px"
                  onChange={(v) => patchShadow({ blurPx: v })}
                />
                <RangeField
                  label="扩展"
                  value={shadowDraft.spreadPx}
                  min={-20}
                  max={40}
                  unit="px"
                  onChange={(v) => patchShadow({ spreadPx: v })}
                />
                <ColorField
                  label="阴影色"
                  value={shadowDraft.color}
                  onChange={(v) => patchShadow({ color: v })}
                />
              </>
            )}
          </>
        ) : null}
      </FieldGroup>

      <FieldGroup title="气泡背景图" hint="贴图铺底；可与玻璃叠加。空则用上方颜色/渐变。">
        <BgImageCropField
          label="背景图"
          value={side.bgImage}
          aspect={3 / 2}
          title={prefix === 'self' ? '裁剪自己气泡背景' : '裁剪对方气泡背景'}
          hint="约 3:2，封面式裁剪"
          onChange={(v) => p('bgImage', v)}
        />
        {side.bgImage.trim() ? (
          <RangeField
            label="背景图模糊"
            value={side.bgImageBlurPx}
            min={0}
            max={24}
            unit="px"
            onChange={(v) => p('bgImageBlurPx', v)}
          />
        ) : null}
      </FieldGroup>

      <FieldGroup title="文字排版">
        <ColorField label="文字色" value={side.text} onChange={(v) => p('text', v)} />
        <FontUploadField
          label={prefix === 'self' ? 'User 侧字体' : 'Char 侧字体'}
          value={side.font}
          onChange={(v) => p('font', v)}
          previewText={prefix === 'self' ? '这是我的气泡预览。' : '这是对方气泡预览。'}
        />
        <RangeField
          label="字号"
          value={side.fontSizePx}
          min={12}
          max={22}
          unit="px"
          onChange={(v) => p('fontSizePx', v)}
        />
        <RangeField
          label="字重"
          value={side.fontWeight}
          min={300}
          max={700}
          step={100}
          onChange={(v) => p('fontWeight', v)}
        />
        <RangeField
          label="行高"
          value={side.lineHeight}
          min={1}
          max={2}
          step={0.05}
          onChange={(v) => p('lineHeight', v)}
        />
      </FieldGroup>

      <FieldGroup title="形状与边框" hint="内边距、圆角、描边与最大宽度。">
        <RangeField label="上内边距" value={side.padT} min={4} max={24} unit="px" onChange={(v) => p('padT', v)} />
        <RangeField label="右内边距" value={side.padR} min={4} max={28} unit="px" onChange={(v) => p('padR', v)} />
        <RangeField label="下内边距" value={side.padB} min={4} max={24} unit="px" onChange={(v) => p('padB', v)} />
        <RangeField label="左内边距" value={side.padL} min={4} max={28} unit="px" onChange={(v) => p('padL', v)} />
        <RangeField label="圆角" value={side.radius} min={0} max={28} unit="px" onChange={(v) => p('radius', v)} />
        <ColorField label="边框色" value={side.borderColor} onChange={(v) => p('borderColor', v)} />
        <RangeField
          label="边框粗细"
          value={side.borderWidth}
          min={0}
          max={4}
          unit="px"
          onChange={(v) => p('borderWidth', v)}
        />
        <RangeField
          label="最大宽度"
          value={side.maxWidthPct}
          min={40}
          max={90}
          unit="%"
          onChange={(v) => p('maxWidthPct', v)}
        />
        <p className="text-[10px] leading-relaxed text-neutral-400">
          「最大宽度」限制长文换行前能撑到多宽；短句不够宽时几乎看不出变化。
        </p>
      </FieldGroup>

      <FieldGroup title="外侧角标" hint="皮肤装饰文案（非真实时间戳），可贴聊天中心或头像侧。">
        <ToggleField
          label="显示角标"
          checked={badge.enabled}
          onChange={(v) =>
            patchBadge({
              enabled: v,
              // 首次打开时给默认文案，避免空字看不见
              ...(v && !badge.text.trim() ? { text: '角标' } : null),
            })
          }
        />
        {badge.enabled ? (
          <>
            <TextField
              label="角标文字"
              value={badge.text}
              placeholder="如 11222 / 已读"
              onChange={(v) => patchBadge({ text: v.slice(0, 24) })}
            />
            <SelectField
              label="连续发送显示"
              value={badge.cluster}
              options={[
                { value: 'every', label: '每条都显示' },
                { value: 'first', label: '仅首条' },
                { value: 'last', label: '仅末条' },
              ]}
              onChange={(v) => patchBadge({ cluster: v })}
            />
            <SelectField
              label="相对气泡位置"
              value={badge.side}
              options={[
                { value: 'inner', label: '靠聊天中心一侧' },
                { value: 'outer', label: '靠头像一侧' },
              ]}
              onChange={(v) => patchBadge({ side: v })}
            />
            <RangeField
              label="上下位置"
              value={badge.yPct}
              min={0}
              max={100}
              unit="%"
              onChange={(v) => patchBadge({ yPct: v })}
            />
            <RangeField
              label="与气泡间距"
              value={badge.gapPx}
              min={0}
              max={24}
              unit="px"
              onChange={(v) => patchBadge({ gapPx: v })}
            />
            <ToggleField
              label="背景条"
              checked={badge.showBg !== false}
              onChange={(v) => patchBadge({ showBg: v })}
            />
            {badge.showBg !== false ? (
              <>
                <ColorField
                  label="背景条颜色"
                  value={badge.bg}
                  onChange={(v) => patchBadge({ bg: v })}
                />
                <RangeField
                  label="背景条透明度"
                  value={badge.bgOpacityPct ?? 100}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(v) => patchBadge({ bgOpacityPct: v })}
                />
                <RangeField
                  label="背景条圆角"
                  value={badge.radiusPx}
                  min={0}
                  max={999}
                  unit="px"
                  onChange={(v) => patchBadge({ radiusPx: v })}
                />
                <RangeField
                  label="水平内边距"
                  value={badge.padX}
                  min={2}
                  max={20}
                  unit="px"
                  onChange={(v) => patchBadge({ padX: v })}
                />
                <RangeField
                  label="垂直内边距"
                  value={badge.padY}
                  min={1}
                  max={12}
                  unit="px"
                  onChange={(v) => patchBadge({ padY: v })}
                />
              </>
            ) : null}
            <ColorField
              label="角标文字色"
              value={badge.textColor}
              onChange={(v) => patchBadge({ textColor: v })}
            />
            <RangeField
              label="角标字号"
              value={badge.fontSizePx}
              min={8}
              max={16}
              unit="px"
              onChange={(v) => patchBadge({ fontSizePx: v })}
            />
            <FontUploadField
              label="角标字体"
              value={badge.font}
              onChange={(v) => patchBadge({ font: v })}
              hint="留空则跟随该侧气泡文字字体"
              emptyText="跟随气泡文字字体"
              previewText={badge.text.trim() || '角标 Aa'}
            />
          </>
        ) : null}
      </FieldGroup>

      <FieldGroup title="气泡尖角" hint="几何可调；表面默认跟随气泡条，也可单独设纯色 / 渐变 / 液态玻璃。">
        <ToggleField label="显示尖角" checked={side.showTail} onChange={(v) => p('showTail', v)} />
        {side.showTail ? (
          <>
            <SelectField
              label="贴边位置"
              value={side.tailAnchor ?? 'side'}
              options={[
                { value: 'side', label: '侧边（头像侧）' },
                { value: 'bottom', label: '底部' },
              ]}
              onChange={(v) => p('tailAnchor', v)}
            />
            <SelectField
              label="连续气泡显示"
              value={side.tailCluster}
              options={[
                { value: 'every', label: '每条都显示' },
                { value: 'first', label: '仅首条' },
                { value: 'last', label: '仅末条' },
              ]}
              onChange={(v) => p('tailCluster', v)}
            />
            {(side.tailAnchor ?? 'side') === 'side' ? (
              <>
                <SelectField
                  label="尖角高度定位"
                  value={side.tailYMode ?? 'pct'}
                  options={[
                    { value: 'pct', label: '相对气泡百分比' },
                    { value: 'avatar', label: '跟随头像高度' },
                  ]}
                  onChange={(v) => p('tailYMode', v)}
                />
                {(side.tailYMode ?? 'pct') === 'pct' ? (
                  <>
                    <RangeField
                      label="尖角位置（上下）"
                      value={side.tailOffsetYPct}
                      min={0}
                      max={100}
                      unit="%"
                      onChange={(v) => p('tailOffsetYPct', v)}
                    />
                    <p className="text-[10px] leading-relaxed text-neutral-400">
                      相对气泡高度：0% 贴顶、50% 居中、100% 贴底；气泡变高时尖角仍停在同一相对位置。
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] leading-relaxed text-neutral-400">
                    尖角垂直中心对齐头像中心（按实际位置跟随）；拖动「头像相对气泡」或改头像尺寸时会一起动。与上方百分比互斥。
                  </p>
                )}
                <RangeField
                  label="尖角位置（横向）"
                  value={side.tailOffsetXPx ?? 0}
                  min={-40}
                  max={48}
                  unit="px"
                  onChange={(v) => p('tailOffsetXPx', v)}
                />
                <p className="text-[10px] leading-relaxed text-neutral-400">
                  横向：正值更朝头像探出，负值更塞进气泡。
                </p>
              </>
            ) : (
              <RangeField
                label="尖角位置（水平）"
                value={side.tailOffsetXPct ?? 0}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => p('tailOffsetXPct', v)}
              />
            )}
            <RangeField
              label="尖角长度"
              value={side.tailLengthPx}
              min={4}
              max={20}
              unit="px"
              onChange={(v) => p('tailLengthPx', v)}
            />
            <RangeField
              label="开口角度"
              value={side.tailAngleDeg}
              min={25}
              max={100}
              unit="°"
              onChange={(v) => p('tailAngleDeg', v)}
            />
            <RangeField
              label="尖角倾斜"
              value={side.tailTiltDeg ?? 0}
              min={-60}
              max={60}
              unit="°"
              onChange={(v) => p('tailTiltDeg', v)}
            />
            <p className="text-[10px] leading-relaxed text-neutral-400">
              绕贴边旋转：负值逆时针、正值顺时针；0° 为水平探出。
            </p>
            <RangeField
              label="尖角圆尖"
              value={side.tailRoundPx}
              min={0}
              max={8}
              step={0.5}
              unit="px"
              onChange={(v) => p('tailRoundPx', v)}
            />

            <SelectField
              label="尖角表面"
              value={side.tailSurfaceMode ?? 'follow'}
              options={[
                { value: 'follow', label: '跟随气泡条' },
                { value: 'custom', label: '单独设置' },
              ]}
              onChange={(v) => {
                p('tailSurfaceMode', v)
                if (v === 'custom') {
                  // 切入自定义时：若尚未填过，从气泡条拷一份起步
                  if (!String(side.tailBg ?? '').trim()) p('tailBg', side.bg)
                  if ((side.tailGradientMode ?? 'off') === 'off' && gradientMode !== 'off') {
                    p('tailGradientMode', gradientMode)
                    p('tailGradientAngleDeg', gradientAngleDeg)
                    p('tailGradientStops', gradientStops)
                    p('tailBgGradient', side.bgGradient)
                  }
                  if (!side.tailGlassEnabled && glassEnabled) {
                    p('tailGlassEnabled', true)
                    p('tailGlassBlurPx', glassBlurPx)
                    p('tailGlassSaturatePct', glassSaturatePct)
                  }
                }
              }}
            />
            {(side.tailSurfaceMode ?? 'follow') === 'custom' ? (
              <>
                <ColorField
                  label={
                    (side.tailGradientMode ?? 'off') !== 'off'
                      ? '尖角色（渐变开启时不参与填充）'
                      : '尖角色（建议半透明）'
                  }
                  value={side.tailBg || side.bg}
                  onChange={(v) => p('tailBg', v)}
                />
                <ToggleField
                  label="尖角毛玻璃"
                  checked={side.tailGlassEnabled === true}
                  onChange={(v) => p('tailGlassEnabled', v)}
                />
                {side.tailGlassEnabled ? (
                  <>
                    <RangeField
                      label="尖角玻璃模糊"
                      value={
                        Number.isFinite(side.tailGlassBlurPx)
                          ? side.tailGlassBlurPx
                          : baseSide.tailGlassBlurPx
                      }
                      min={0}
                      max={40}
                      unit="px"
                      onChange={(v) => p('tailGlassBlurPx', v)}
                    />
                    <RangeField
                      label="尖角玻璃饱和"
                      value={
                        Number.isFinite(side.tailGlassSaturatePct)
                          ? side.tailGlassSaturatePct
                          : baseSide.tailGlassSaturatePct
                      }
                      min={100}
                      max={200}
                      unit="%"
                      onChange={(v) => p('tailGlassSaturatePct', v)}
                    />
                  </>
                ) : null}
                <SelectField
                  label="尖角渐变"
                  value={side.tailGradientMode ?? 'off'}
                  options={[
                    { value: 'off', label: '关闭（纯色）' },
                    { value: 'stops', label: '色标编辑' },
                    { value: 'css', label: '手写 CSS' },
                  ]}
                  onChange={(v) => {
                    p('tailGradientMode', v)
                    if (v !== 'off' && isOpaqueSolidCssColor(side.tailBg || side.bg)) {
                      p('tailBg', 'rgba(255,255,255,0.45)')
                    }
                  }}
                />
                {(side.tailGradientMode ?? 'off') === 'stops' ? (
                  <>
                    <RangeField
                      label="尖角渐变角度"
                      value={
                        Number.isFinite(side.tailGradientAngleDeg)
                          ? side.tailGradientAngleDeg
                          : 135
                      }
                      min={0}
                      max={360}
                      unit="°"
                      onChange={(v) => p('tailGradientAngleDeg', v)}
                    />
                    {(Array.isArray(side.tailGradientStops) && side.tailGradientStops.length >= 2
                      ? side.tailGradientStops
                      : baseSide.tailGradientStops
                    ).map((stop, i) => {
                      const stops =
                        Array.isArray(side.tailGradientStops) && side.tailGradientStops.length >= 2
                          ? side.tailGradientStops
                          : baseSide.tailGradientStops
                      return (
                        <div
                          key={i}
                          className="space-y-1 rounded-lg border border-black/6 bg-white/70 p-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-neutral-500">尖角色标 {i + 1}</span>
                            {stops.length > 2 ? (
                              <button
                                type="button"
                                className="text-[10px] text-red-600/80"
                                onClick={() => {
                                  if (stops.length <= 2) return
                                  p(
                                    'tailGradientStops',
                                    stops.filter((_, j) => j !== i),
                                  )
                                }}
                              >
                                删除
                              </button>
                            ) : null}
                          </div>
                          <ColorField
                            label="颜色"
                            value={stop.color}
                            onChange={(v) => {
                              p(
                                'tailGradientStops',
                                stops.map((s, j) => (j === i ? { ...s, color: v } : s)),
                              )
                            }}
                          />
                          <RangeField
                            label="位置"
                            value={stop.atPct}
                            min={0}
                            max={100}
                            unit="%"
                            onChange={(v) => {
                              p(
                                'tailGradientStops',
                                stops.map((s, j) => (j === i ? { ...s, atPct: v } : s)),
                              )
                            }}
                          />
                        </div>
                      )
                    })}
                    {(Array.isArray(side.tailGradientStops) ? side.tailGradientStops.length : 0) <
                    5 ? (
                      <button
                        type="button"
                        className="text-[11px] text-sky-700"
                        onClick={() => {
                          const stops =
                            Array.isArray(side.tailGradientStops) &&
                            side.tailGradientStops.length >= 2
                              ? side.tailGradientStops
                              : baseSide.tailGradientStops
                          if (stops.length >= 5) return
                          const last = stops[stops.length - 1]
                          p('tailGradientStops', [
                            ...stops,
                            {
                              atPct: Math.min(100, (last?.atPct ?? 50) + 20),
                              color: last?.color ?? '#ffffff',
                            },
                          ])
                        }}
                      >
                        + 添加色标
                      </button>
                    ) : null}
                  </>
                ) : null}
                {(side.tailGradientMode ?? 'off') === 'css' ? (
                  <TextField
                    label="尖角渐变 CSS"
                    value={side.tailBgGradient ?? ''}
                    onChange={(v) => p('tailBgGradient', v)}
                    placeholder="linear-gradient(135deg, …)"
                  />
                ) : null}
              </>
            ) : (
              <p className="text-[10px] leading-relaxed text-neutral-400">
                当前跟随气泡条的底色、渐变与毛玻璃；改成「单独设置」后可分开调。
              </p>
            )}
          </>
        ) : null}
      </FieldGroup>

      <FieldGroup title="气泡装饰" hint="九宫格框与四边贴纸（上传素材）。">
        <BubbleFrameFields frame={side.frame ?? null} onChange={(next) => p('frame', next)} />
        <EdgeStickersFields
          stickers={side.edgeStickers ?? []}
          onChange={(next) => p('edgeStickers', next)}
        />
      </FieldGroup>
    </div>
  )
}

const FRAME_EDGE_MODE_OPTIONS: { value: BubbleFrameEdgeMode; label: string }[] = [
  { value: 'stretch', label: '拉伸' },
  { value: 'repeat', label: '平铺' },
  { value: 'round', label: '圆整平铺' },
]

function BubbleFrameFields({
  frame,
  onChange,
}: {
  frame: BubbleFrame | null
  onChange: (next: BubbleFrame | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const pickCanvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(frame)
  frameRef.current = frame
  const [busy, setBusy] = useState(false)
  const [chromaBusy, setChromaBusy] = useState(false)
  const [error, setError] = useState('')
  const [pickHint, setPickHint] = useState(false)
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null)
  const active = frame && frame.imageDataUrl.trim() ? frame : null
  const chroma = active ? normalizeChromaKey(active.chromaKey) : { ...DEFAULT_CHROMA_KEY }
  const sourceUrl = active ? frameSourceUrl(active) : ''
  const sliceMaxX = imgSize ? Math.max(1, Math.floor(imgSize.w / 2) - 1) : 256
  const sliceMaxY = imgSize ? Math.max(1, Math.floor(imgSize.h / 2) - 1) : 256

  const patch = (partial: Partial<BubbleFrame>) => {
    const base = active ?? defaultBubbleFrame()
    onChange({ ...base, ...partial })
  }

  const patchChroma = (partial: Partial<ChromaKeyConfig>) => {
    if (!active) return
    const nextCk = { ...chroma, ...partial }
    patch({
      sourceImageDataUrl: sourceUrl,
      chromaKey: nextCk,
    })
  }

  // 读原图尺寸并钳制过大切片（否则九宫格会塌）
  useEffect(() => {
    if (!sourceUrl) {
      setImgSize(null)
      return
    }
    let cancelled = false
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      if (cancelled) return
      const w = Math.max(1, img.naturalWidth || img.width)
      const h = Math.max(1, img.naturalHeight || img.height)
      setImgSize({ w, h })
      const latest = frameRef.current
      if (!latest?.imageDataUrl.trim()) return
      const clamped = clampBubbleFrameSlicesToImage(latest, w, h)
      if (
        clamped.sliceTop !== latest.sliceTop ||
        clamped.sliceRight !== latest.sliceRight ||
        clamped.sliceBottom !== latest.sliceBottom ||
        clamped.sliceLeft !== latest.sliceLeft
      ) {
        onChange(clamped)
      }
    }
    img.src = sourceUrl
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceUrl])

  // 参数变化时把抠图结果烘焙进 imageDataUrl（预览 / 导出共用）
  useEffect(() => {
    if (!sourceUrl) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      void (async () => {
        setChromaBusy(true)
        try {
          const baked = await bakeChromaKeyDataUrl(sourceUrl, chroma, { maxSide: 640 })
          if (cancelled || !baked) return
          const latest = frameRef.current
          if (!latest?.imageDataUrl.trim()) return
          if (baked === latest.imageDataUrl) return
          onChange({
            ...latest,
            sourceImageDataUrl: sourceUrl,
            chromaKey: chroma,
            imageDataUrl: baked,
          })
        } catch {
          if (!cancelled) setError('抠图处理失败')
        } finally {
          if (!cancelled) setChromaBusy(false)
        }
      })()
    }, 140)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅跟抠图相关字段
  }, [
    sourceUrl,
    chroma.enabled,
    chroma.targetColor,
    chroma.tolerance,
    chroma.edgeSoftness,
  ])

  // 取色预览：始终画原图，方便点选背景色
  useEffect(() => {
    const canvas = pickCanvasRef.current
    if (!canvas || !sourceUrl) return
    let cancelled = false
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      if (cancelled) return
      const maxSide = 280
      const sw = Math.max(1, img.naturalWidth || img.width)
      const sh = Math.max(1, img.naturalHeight || img.height)
      const scale = Math.min(1, maxSide / Math.max(sw, sh))
      const w = Math.max(1, Math.round(sw * scale))
      const h = Math.max(1, Math.round(sh * scale))
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
    }
    img.src = sourceUrl
    return () => {
      cancelled = true
    }
  }, [sourceUrl])

  const onPick = async (file: File | null) => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const { dataUrl, width, height } = await readAndCompressBubbleFrame(file)
      if (!dataUrl) throw new Error('图片无效')
      const slices =
        width > 0 && height > 0
          ? defaultSliceFromImageSize(width, height)
          : {
              sliceTop: 32,
              sliceRight: 32,
              sliceBottom: 32,
              sliceLeft: 32,
              borderWidthPx: 16,
            }
      const keepCk = active?.chromaKey
        ? normalizeChromaKey(active.chromaKey)
        : { ...DEFAULT_CHROMA_KEY }
      onChange({
        ...(active ?? defaultBubbleFrame()),
        imageDataUrl: dataUrl,
        sourceImageDataUrl: dataUrl,
        chromaKey: keepCk,
        ...slices,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const onCanvasPick = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = pickCanvasRef.current
    if (!canvas || !pickHint) return
    const hex = sampleCanvasHex(canvas, e.clientX, e.clientY)
    if (!hex) return
    patchChroma({ enabled: true, targetColor: hex })
    setPickHint(false)
  }

  const onEyeDropper = async () => {
    const hex = await pickColorWithEyeDropper()
    if (!hex) return
    patchChroma({ enabled: true, targetColor: hex })
  }

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-black/6 bg-black/[0.02] p-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium tracking-wide text-neutral-600">九宫格气泡框</span>
        {active ? (
          <button
            type="button"
            className="shrink-0 rounded-lg px-2 py-0.5 text-[11px] text-red-600/80 hover:bg-red-50"
            onClick={() => onChange(null)}
          >
            清除
          </button>
        ) : null}
      </div>
      <p className="text-[10px] leading-relaxed text-neutral-400">
        上传框图式贴纸。四角保持原样，四边随气泡长短自动拉伸。圆角请画在素材里（CSS border-radius
        对九宫格框无效）。
      </p>
      <div className="flex items-center gap-2">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/8 bg-[length:10px_10px] bg-[linear-gradient(45deg,#eee_25%,transparent_25%,transparent_75%,#eee_75%),linear-gradient(45deg,#eee_25%,transparent_25%,transparent_75%,#eee_75%)] bg-[position:0_0,5px_5px]"
          aria-hidden
        >
          {active ? (
            <img
              src={active.imageDataUrl}
              alt=""
              className="max-h-full max-w-full object-contain"
              draggable={false}
            />
          ) : (
            <span className="text-[10px] text-neutral-300">框</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/webp,image/jpeg"
            className="hidden"
            onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            disabled={busy}
            className="lw-btn rounded-lg px-2.5 py-1.5 text-[11px]"
            onClick={() => inputRef.current?.click()}
          >
            {busy ? '处理中…' : active ? '更换框图' : '上传气泡框'}
          </button>
          <p className="mt-0.5 text-[10px] text-neutral-400">
            PNG / WebP{chromaBusy ? ' · 抠图更新中…' : ''}
          </p>
          {error ? <p className="mt-0.5 text-[10px] text-red-500">{error}</p> : null}
        </div>
      </div>
      {active ? (
        <>
          <div className="space-y-2 rounded-lg border border-black/6 bg-white/80 p-2">
            <ToggleField
              label="色度抠图"
              checked={chroma.enabled}
              onChange={(v) => patchChroma({ enabled: v })}
            />
            <p className="text-[10px] leading-relaxed text-neutral-400">
              点「从图取色」后在下方原图上点背景色；也可系统吸色或调色盘。调强度 / 羽化会实时更新框。
            </p>
            <div className="relative overflow-hidden rounded-lg border border-black/8 bg-[length:12px_12px] bg-[linear-gradient(45deg,#e8e8e8_25%,transparent_25%,transparent_75%,#e8e8e8_75%),linear-gradient(45deg,#e8e8e8_25%,transparent_25%,transparent_75%,#e8e8e8_75%)] bg-[position:0_0,6px_6px]">
              <canvas
                ref={pickCanvasRef}
                className={`mx-auto block max-h-40 w-auto max-w-full ${
                  pickHint ? 'cursor-crosshair' : 'cursor-default'
                }`}
                onClick={onCanvasPick}
              />
              {pickHint ? (
                <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-center text-[10px] text-white">
                  点击图上要抠掉的颜色
                </p>
              ) : null}
            </div>
            {chroma.enabled ? (
              <div className="overflow-hidden rounded-lg border border-black/8 bg-[length:10px_10px] bg-[linear-gradient(45deg,#eee_25%,transparent_25%,transparent_75%,#eee_75%),linear-gradient(45deg,#eee_25%,transparent_25%,transparent_75%,#eee_75%)] bg-[position:0_0,5px_5px] p-1">
                <img
                  src={active.imageDataUrl}
                  alt=""
                  className="mx-auto max-h-28 object-contain"
                  draggable={false}
                />
                <p className="mt-0.5 text-center text-[10px] text-neutral-400">抠图结果预览</p>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="color"
                value={chroma.targetColor}
                onChange={(e) => {
                  patchChroma({ enabled: true, targetColor: e.target.value.toUpperCase() })
                  e.currentTarget.blur()
                }}
                className="h-8 w-8 rounded border border-black/10 bg-transparent p-0"
                aria-label="抠图目标色"
              />
              <button
                type="button"
                className={`rounded-lg border px-2.5 py-1 text-[11px] ${
                  pickHint
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-black/10 text-neutral-600 hover:bg-neutral-50'
                }`}
                onClick={() => setPickHint((v) => !v)}
              >
                {pickHint ? '取色中…' : '从图取色'}
              </button>
              {supportsEyeDropper() ? (
                <button
                  type="button"
                  className="rounded-lg border border-black/10 px-2.5 py-1 text-[11px] text-neutral-600 hover:bg-neutral-50"
                  onClick={() => void onEyeDropper()}
                >
                  系统吸色
                </button>
              ) : null}
              {CHROMA_COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="h-6 w-6 rounded-full border border-black/10"
                  style={{ background: c }}
                  onClick={() => patchChroma({ enabled: true, targetColor: c })}
                  aria-label={`预设 ${c}`}
                />
              ))}
            </div>
            <RangeField
              label="抠图强度"
              value={chroma.tolerance}
              min={0}
              max={100}
              unit=""
              onChange={(v) => patchChroma({ enabled: true, tolerance: v })}
            />
            <RangeField
              label="边缘羽化"
              value={chroma.edgeSoftness}
              min={0}
              max={100}
              unit=""
              onChange={(v) => patchChroma({ enabled: true, edgeSoftness: v })}
            />
          </div>

          <RangeField
            label="上切片"
            value={Math.min(active.sliceTop, sliceMaxY)}
            min={1}
            max={sliceMaxY}
            unit="px"
            onChange={(v) => patch({ sliceTop: v })}
          />
          <RangeField
            label="右切片"
            value={Math.min(active.sliceRight, sliceMaxX)}
            min={1}
            max={sliceMaxX}
            unit="px"
            onChange={(v) => patch({ sliceRight: v })}
          />
          <RangeField
            label="下切片"
            value={Math.min(active.sliceBottom, sliceMaxY)}
            min={1}
            max={sliceMaxY}
            unit="px"
            onChange={(v) => patch({ sliceBottom: v })}
          />
          <RangeField
            label="左切片"
            value={Math.min(active.sliceLeft, sliceMaxX)}
            min={1}
            max={sliceMaxX}
            unit="px"
            onChange={(v) => patch({ sliceLeft: v })}
          />
          <p className="text-[10px] leading-relaxed text-neutral-400">
            切片是原图四边保留区，一般设为框边厚度附近；过大（超过原图一半）会把框图揉坏。
          </p>
          <RangeField
            label="框厚度"
            value={active.borderWidthPx}
            min={1}
            max={48}
            unit="px"
            onChange={(v) => patch({ borderWidthPx: v })}
          />
          <RangeField
            label="外扩（再往外探）"
            value={active.outsetPx}
            min={0}
            max={32}
            unit="px"
            onChange={(v) => patch({ outsetPx: v })}
          />
          <p className="text-[10px] leading-relaxed text-neutral-400">
            边框叠在气泡条上方（可盖住边缘）；「外扩」是在此基础上再探出气泡外。图层：气泡底 ＜ 边框 ＜ 贴纸 ＜ 文字。
          </p>
          <RangeField
            label="透明度"
            value={active.opacityPct}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => patch({ opacityPct: v })}
          />
          <SelectField
            label="边模式"
            value={active.edgeMode}
            options={FRAME_EDGE_MODE_OPTIONS}
            onChange={(v) => patch({ edgeMode: v })}
          />
          <ToggleField
            label="绘制框图中间（推荐开）"
            checked={active.fillCenter}
            onChange={(v) => patch({ fillCenter: v })}
          />
          <p className="text-[10px] leading-relaxed text-neutral-400">
            开启后，框图轮廓会叠在气泡底色之上（猫耳等整框不会被白底截断）。关闭则只留四边细条。底色在最底层，不盖边框。
          </p>
        </>
      ) : null}
    </div>
  )
}

const EDGE_OPTIONS: { value: BubbleEdge; label: string }[] = [
  { value: 'top', label: '上边' },
  { value: 'right', label: '右边' },
  { value: 'bottom', label: '下边' },
  { value: 'left', label: '左边' },
]

function EdgeStickersFields({
  stickers,
  onChange,
}: {
  stickers: BubbleEdgeSticker[]
  onChange: (next: BubbleEdgeSticker[]) => void
}) {
  const atCap = stickers.length >= MAX_BUBBLE_EDGE_STICKERS_PER_SIDE

  const patchAt = (index: number, patch: Partial<BubbleEdgeSticker>) => {
    onChange(stickers.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  const removeAt = (index: number) => {
    onChange(stickers.filter((_, i) => i !== index))
  }

  const addSticker = (dataUrl: string) => {
    if (!dataUrl.trim() || atCap) return
    onChange([
      ...stickers,
      {
        id: newBubbleEdgeStickerId(),
        edge: 'top',
        alongPct: 50,
        sizePx: 24,
        outsetPx: 0,
        rotateDeg: 0,
        opacityPct: 100,
        imageDataUrl: dataUrl,
      },
    ])
  }

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-black/6 bg-black/[0.02] p-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium tracking-wide text-neutral-600">四边贴纸</span>
        <span className="text-[10px] tabular-nums text-neutral-400">
          {stickers.length}/{MAX_BUBBLE_EDGE_STICKERS_PER_SIDE}
        </span>
      </div>
      <p className="text-[10px] leading-relaxed text-neutral-400">
        贴在气泡四条边上，用沿边百分比定位；可调大小、倾斜与透明度。
      </p>
      {stickers.map((s, i) => (
        <div
          key={s.id}
          className="space-y-1.5 rounded-lg border border-black/6 bg-white/80 p-2"
        >
          <div className="flex items-center gap-2">
            <img
              src={s.imageDataUrl}
              alt=""
              className="h-8 w-8 shrink-0 object-contain"
              draggable={false}
              style={{
                transform: `rotate(${s.rotateDeg ?? 0}deg)`,
                opacity: (s.opacityPct ?? 100) / 100,
              }}
            />
            <SelectField
              label="所在边"
              value={s.edge}
              options={EDGE_OPTIONS}
              onChange={(v) => patchAt(i, { edge: v })}
            />
            <button
              type="button"
              className="ml-auto shrink-0 rounded-lg px-2 py-1 text-[11px] text-red-600/80 hover:bg-red-50"
              onClick={() => removeAt(i)}
            >
              删除
            </button>
          </div>
          <RangeField
            label="沿边位置"
            value={s.alongPct}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => patchAt(i, { alongPct: v })}
          />
          <RangeField
            label="大小"
            value={s.sizePx}
            min={8}
            max={96}
            unit="px"
            onChange={(v) => patchAt(i, { sizePx: v })}
          />
          <RangeField
            label="倾斜"
            value={s.rotateDeg ?? 0}
            min={-180}
            max={180}
            unit="°"
            onChange={(v) => patchAt(i, { rotateDeg: v })}
          />
          <RangeField
            label="透明度"
            value={s.opacityPct ?? 100}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => patchAt(i, { opacityPct: v })}
          />
          <RangeField
            label="外偏"
            value={s.outsetPx}
            min={-12}
            max={32}
            unit="px"
            onChange={(v) => patchAt(i, { outsetPx: v })}
          />
        </div>
      ))}
      {atCap ? (
        <p className="text-[10px] text-neutral-400">本侧已满 {MAX_BUBBLE_EDGE_STICKERS_PER_SIDE} 张</p>
      ) : (
        <ImageUploadField
          label="上传贴纸"
          value=""
          hint="PNG / WebP（保留透明）"
          onChange={addSticker}
        />
      )}
    </div>
  )
}

function AvatarStickersFields({
  stickers,
  onChange,
  avatarSizePx,
}: {
  stickers: AvatarSticker[]
  onChange: (next: AvatarSticker[]) => void
  avatarSizePx: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const atCap = stickers.length >= MAX_AVATAR_STICKERS_PER_SIDE

  const patchAt = (index: number, patch: Partial<AvatarSticker>) => {
    onChange(stickers.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  const removeAt = (index: number) => {
    onChange(stickers.filter((_, i) => i !== index))
  }

  const onPick = async (file: File | null) => {
    if (!file || atCap) return
    setBusy(true)
    setError('')
    try {
      const dataUrl = await readAvatarStickerFile(file)
      onChange([
        ...stickers,
        {
          id: newAvatarStickerId(),
          xPct: 50,
          yPct: 50,
          sizePx: Math.min(MAX_AVATAR_STICKER_SIZE_PX, Math.max(avatarSizePx, 40)),
          rotateDeg: 0,
          opacityPct: 100,
          imageDataUrl: dataUrl,
          sourceImageDataUrl: dataUrl,
          chromaKey: { ...DEFAULT_CHROMA_KEY },
        },
      ])
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-black/6 bg-black/[0.02] p-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium tracking-wide text-neutral-600">头像贴纸</span>
        <span className="text-[10px] tabular-nums text-neutral-400">
          {stickers.length}/{MAX_AVATAR_STICKERS_PER_SIDE}
        </span>
      </div>
      <p className="text-[10px] leading-relaxed text-neutral-400">
        盖在头像上方（可遮住头像）。支持 PNG / WebP / GIF 动图；可调位置、大小、倾斜与透明度。静图可开色度抠图。大小上限{' '}
        {MAX_AVATAR_STICKER_SIZE_PX}px。
      </p>
      {stickers.map((s, i) => (
        <AvatarStickerEditor
          key={s.id}
          sticker={s}
          avatarSizePx={avatarSizePx}
          onChange={(patch) => patchAt(i, patch)}
          onRemove={() => removeAt(i)}
          onReplaceAt={(next) => patchAt(i, next)}
        />
      ))}
      {atCap ? (
        <p className="text-[10px] text-neutral-400">本侧已满 {MAX_AVATAR_STICKERS_PER_SIDE} 张</p>
      ) : (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/webp,image/jpeg,image/gif"
            className="hidden"
            onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            disabled={busy}
            className="lw-btn rounded-lg px-2.5 py-1.5 text-[11px]"
            onClick={() => inputRef.current?.click()}
          >
            {busy ? '处理中…' : '上传头像贴纸'}
          </button>
          <p className="mt-0.5 text-[10px] text-neutral-400">PNG / WebP / GIF（动图原样保留）</p>
          {error ? <p className="mt-0.5 text-[10px] text-red-500">{error}</p> : null}
        </div>
      )}
    </div>
  )
}

function AvatarStickerEditor({
  sticker,
  avatarSizePx,
  onChange,
  onRemove,
  onReplaceAt,
}: {
  sticker: AvatarSticker
  avatarSizePx: number
  onChange: (patch: Partial<AvatarSticker>) => void
  onRemove: () => void
  onReplaceAt: (next: Partial<AvatarSticker>) => void
}) {
  const pickCanvasRef = useRef<HTMLCanvasElement>(null)
  const stickerRef = useRef(sticker)
  stickerRef.current = sticker
  const [chromaBusy, setChromaBusy] = useState(false)
  const [pickHint, setPickHint] = useState(false)
  const [chromaError, setChromaError] = useState('')
  const chroma = normalizeChromaKey(sticker.chromaKey)
  const sourceUrl = avatarStickerSourceUrl(sticker)
  const isGif = isAvatarStickerGif(sourceUrl)

  const patchChroma = (partial: Partial<ChromaKeyConfig>) => {
    if (isGif) return
    onReplaceAt({
      sourceImageDataUrl: sourceUrl,
      chromaKey: { ...chroma, ...partial },
    })
  }

  useEffect(() => {
    if (isGif || !sourceUrl) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      void (async () => {
        setChromaBusy(true)
        try {
          const baked = await bakeChromaKeyDataUrl(sourceUrl, chroma, { maxSide: 320 })
          if (cancelled || !baked) return
          const latest = stickerRef.current
          if (baked === latest.imageDataUrl) return
          onReplaceAt({
            sourceImageDataUrl: sourceUrl,
            chromaKey: chroma,
            imageDataUrl: baked,
          })
        } catch {
          if (!cancelled) setChromaError('抠图处理失败')
        } finally {
          if (!cancelled) setChromaBusy(false)
        }
      })()
    }, 140)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sourceUrl,
    isGif,
    chroma.enabled,
    chroma.targetColor,
    chroma.tolerance,
    chroma.edgeSoftness,
  ])

  useEffect(() => {
    const canvas = pickCanvasRef.current
    if (!canvas || !sourceUrl || !chroma.enabled || isGif) return
    let cancelled = false
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      if (cancelled) return
      const maxSide = 220
      const sw = Math.max(1, img.naturalWidth || img.width)
      const sh = Math.max(1, img.naturalHeight || img.height)
      const scale = Math.min(1, maxSide / Math.max(sw, sh))
      const w = Math.max(1, Math.round(sw * scale))
      const h = Math.max(1, Math.round(sh * scale))
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
    }
    img.src = sourceUrl
    return () => {
      cancelled = true
    }
  }, [sourceUrl, chroma.enabled, isGif])

  const onCanvasPick = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!pickHint) return
    const canvas = pickCanvasRef.current
    if (!canvas) return
    const hex = sampleCanvasHex(canvas, e.clientX, e.clientY)
    if (!hex) return
    patchChroma({ enabled: true, targetColor: hex })
    setPickHint(false)
  }

  const onEyeDropper = async () => {
    const hex = await pickColorWithEyeDropper()
    if (hex) patchChroma({ enabled: true, targetColor: hex })
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-black/6 bg-white/80 p-2">
      <div className="flex items-center gap-2">
        <img
          src={sticker.imageDataUrl}
          alt=""
          className="h-8 w-8 shrink-0 object-contain"
          draggable={false}
          style={{
            transform: `rotate(${sticker.rotateDeg ?? 0}deg)`,
            opacity: (sticker.opacityPct ?? 100) / 100,
          }}
        />
        <button
          type="button"
          className="ml-auto shrink-0 rounded-lg px-2 py-1 text-[11px] text-red-600/80 hover:bg-red-50"
          onClick={onRemove}
        >
          删除
        </button>
      </div>
      <RangeField
        label="水平位置"
        value={sticker.xPct}
        min={0}
        max={100}
        unit="%"
        onChange={(v) => onChange({ xPct: v })}
      />
      <RangeField
        label="垂直位置"
        value={sticker.yPct}
        min={0}
        max={100}
        unit="%"
        onChange={(v) => onChange({ yPct: v })}
      />
      <RangeField
        label="大小"
        value={sticker.sizePx}
        min={MIN_AVATAR_STICKER_SIZE_PX}
        max={MAX_AVATAR_STICKER_SIZE_PX}
        unit="px"
        onChange={(v) => onChange({ sizePx: v })}
      />
      <p className="text-[10px] leading-relaxed text-neutral-400">
        当前约头像的{' '}
        {Math.max(1, Math.round((sticker.sizePx / Math.max(1, avatarSizePx)) * 100))}
        %（头像 {avatarSizePx}px · 上限 {MAX_AVATAR_STICKER_SIZE_PX}px）
      </p>
      <RangeField
        label="倾斜"
        value={sticker.rotateDeg ?? 0}
        min={-180}
        max={180}
        unit="°"
        onChange={(v) => onChange({ rotateDeg: v })}
      />
      <RangeField
        label="透明度"
        value={sticker.opacityPct ?? 100}
        min={0}
        max={100}
        unit="%"
        onChange={(v) => onChange({ opacityPct: v })}
      />
      {isGif ? (
        <p className="text-[10px] text-neutral-400">GIF 动图保留动画，不支持色度抠图。</p>
      ) : (
        <>
          <ToggleField
            label="色度抠图"
            checked={chroma.enabled}
            onChange={(v) => patchChroma({ enabled: v })}
          />
          {chroma.enabled ? (
            <div className="space-y-2 rounded-lg border border-black/6 bg-black/[0.02] p-2">
              <p className="text-[10px] leading-relaxed text-neutral-400">
                点「从图取色」后在原图上点背景色；调强度 / 羽化会实时更新
                {chromaBusy ? ' · 处理中…' : ''}。
              </p>
              <div className="relative overflow-hidden rounded-lg border border-black/8 bg-[length:12px_12px] bg-[linear-gradient(45deg,#e8e8e8_25%,transparent_25%,transparent_75%,#e8e8e8_75%),linear-gradient(45deg,#e8e8e8_25%,transparent_25%,transparent_75%,#e8e8e8_75%)] bg-[position:0_0,6px_6px]">
                <canvas
                  ref={pickCanvasRef}
                  className={`mx-auto block max-h-36 w-auto max-w-full ${
                    pickHint ? 'cursor-crosshair' : 'cursor-default'
                  }`}
                  onClick={onCanvasPick}
                />
                {pickHint ? (
                  <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-center text-[10px] text-white">
                    点击图上要抠掉的颜色
                  </p>
                ) : null}
              </div>
              <div className="overflow-hidden rounded-lg border border-black/8 bg-[length:10px_10px] bg-[linear-gradient(45deg,#eee_25%,transparent_25%,transparent_75%,#eee_75%),linear-gradient(45deg,#eee_25%,transparent_25%,transparent_75%,#eee_75%)] bg-[position:0_0,5px_5px] p-1">
                <img
                  src={sticker.imageDataUrl}
                  alt=""
                  className="mx-auto max-h-24 object-contain"
                  draggable={false}
                />
                <p className="mt-0.5 text-center text-[10px] text-neutral-400">抠图结果</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="color"
                  value={chroma.targetColor}
                  onChange={(e) => {
                    patchChroma({ enabled: true, targetColor: e.target.value.toUpperCase() })
                    e.currentTarget.blur()
                  }}
                  className="h-8 w-8 rounded border border-black/10 bg-transparent p-0"
                  aria-label="抠图目标色"
                />
                <button
                  type="button"
                  className={`rounded-lg border px-2.5 py-1 text-[11px] ${
                    pickHint
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-black/10 text-neutral-600 hover:bg-neutral-50'
                  }`}
                  onClick={() => setPickHint((v) => !v)}
                >
                  {pickHint ? '取色中…' : '从图取色'}
                </button>
                {supportsEyeDropper() ? (
                  <button
                    type="button"
                    className="rounded-lg border border-black/10 px-2.5 py-1 text-[11px] text-neutral-600 hover:bg-neutral-50"
                    onClick={() => void onEyeDropper()}
                  >
                    系统吸色
                  </button>
                ) : null}
                {CHROMA_COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="h-6 w-6 rounded-full border border-black/10"
                    style={{ background: c }}
                    onClick={() => patchChroma({ enabled: true, targetColor: c })}
                    aria-label={`预设色 ${c}`}
                  />
                ))}
              </div>
              <RangeField
                label="抠图强度"
                value={chroma.tolerance}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => patchChroma({ tolerance: v })}
              />
              <RangeField
                label="边缘羽化"
                value={chroma.edgeSoftness}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => patchChroma({ edgeSoftness: v })}
              />
              {chromaError ? <p className="text-[10px] text-red-500">{chromaError}</p> : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

function AvatarSideFields({
  prefix,
  side,
}: {
  prefix: 'other' | 'self'
  side: BubbleSideDraft
}) {
  const patchPath = useLookWorkshopStore((s) => s.patchPath)
  const p = (key: keyof BubbleSideDraft, v: unknown) => patchPath(`${prefix}.${key}`, v)
  return (
    <div className="space-y-3">
      <FieldGroup title="显示策略" hint="连续发送时头像出现频率。">
        <ToggleField
          label="显示头像"
          checked={side.showAvatar}
          onChange={(v) => p('showAvatar', v)}
        />
        <ToggleField
          label="连续发送仅首条显示"
          checked={side.avatarCluster === 'first'}
          onChange={(v) => p('avatarCluster', v ? 'first' : 'every')}
        />
        <ToggleField
          label="连续发送仅末条显示"
          checked={side.avatarCluster === 'last'}
          onChange={(v) => p('avatarCluster', v ? 'last' : 'every')}
        />
        <p className="text-[10px] leading-relaxed text-neutral-400">
          「仅首条 / 仅末条」二选一；都关则每条都显示（仍占位对齐）。
        </p>
      </FieldGroup>

      <FieldGroup title="尺寸与位置">
        <RangeField
          label="距屏幕边距"
          value={side.avatarEdgeInsetPx}
          min={0}
          max={48}
          unit="px"
          onChange={(v) => p('avatarEdgeInsetPx', v)}
        />
        <p className="text-[10px] leading-relaxed text-neutral-400">
          {prefix === 'other' ? '对方头像距屏幕左边' : '自己头像距屏幕右边'}（默认 24）。
        </p>
        <RangeField
          label="头像大小"
          value={side.avatarSizePx}
          min={24}
          max={72}
          unit="px"
          onChange={(v) => p('avatarSizePx', v)}
        />
        <ColorField
          label="示例头像占位色"
          value={side.avatarPlaceholderColor || '#D4D4D4'}
          onChange={(v) => p('avatarPlaceholderColor', v)}
        />
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['#D4D4D4', '浅灰'],
              ['#E5E5E5', '灰白'],
              ['#191919', '深色'],
              ['#FFFFFF', '白色'],
              ['#F5D0C5', '肤色'],
              ['#7C9CE8', '蓝色'],
              ['#95EC69', '微信绿'],
              ['#F2A7C3', '粉色'],
            ] as const
          ).map(([hex, name]) => (
            <button
              key={hex}
              type="button"
              title={name}
              className="h-6 w-6 rounded-md border border-black/10 shadow-sm"
              style={{ background: hex }}
              onClick={() => p('avatarPlaceholderColor', hex)}
            />
          ))}
        </div>
        <p className="text-[10px] leading-relaxed text-neutral-400">
          仅预览占位，方便在不同底色下看贴纸/抠图效果；导出后真机仍用角色真实头像。
        </p>
        <RangeField
          label="头像圆角"
          value={side.avatarRadiusPx}
          min={0}
          max={24}
          unit="px"
          onChange={(v) => p('avatarRadiusPx', v)}
        />
        <RangeField
          label="倾斜角度"
          value={side.avatarRotateDeg}
          min={-45}
          max={45}
          unit="°"
          onChange={(v) => p('avatarRotateDeg', v)}
        />
        <RangeField
          label="相对气泡上下"
          value={side.avatarBubbleYPct}
          min={0}
          max={100}
          unit="%"
          onChange={(v) => p('avatarBubbleYPct', v)}
        />
        <p className="text-[10px] leading-relaxed text-neutral-400">
          0% 顶对齐，50% 居中，100% 底对齐。
        </p>
      </FieldGroup>

      <FieldGroup title="边框">
        <ColorField
          label="头像边框色"
          value={side.avatarBorderColor}
          onChange={(v) => p('avatarBorderColor', v)}
        />
        <RangeField
          label="头像边框"
          value={side.avatarBorderWidth}
          min={0}
          max={4}
          unit="px"
          onChange={(v) => p('avatarBorderWidth', v)}
        />
      </FieldGroup>

      <FieldGroup title="头像装饰贴纸" hint="盖在头像上，支持 GIF。">
        <AvatarStickersFields
          stickers={side.avatarStickers ?? []}
          avatarSizePx={side.avatarSizePx}
          onChange={(next) => p('avatarStickers', next)}
        />
      </FieldGroup>
    </div>
  )
}

function SpecialFields({
  prefix,
  card,
}: {
  prefix: string
  card: SpecialCardDraft
}) {
  const patchPath = useLookWorkshopStore((s) => s.patchPath)
  const p = (key: keyof SpecialCardDraft, v: unknown) => patchPath(`${prefix}.${key}`, v)
  return (
    <div className="space-y-2.5">
      <ToggleField label="跟随普通气泡样式" checked={card.followBubble} onChange={(v) => p('followBubble', v)} />
      <ColorField label="卡片背景" value={card.bg} onChange={(v) => p('bg', v)} />
      <ColorField label="边框色" value={card.borderColor} onChange={(v) => p('borderColor', v)} />
      <RangeField label="边框粗细" value={card.borderWidth} min={0} max={3} unit="px" onChange={(v) => p('borderWidth', v)} />
      <RangeField label="圆角" value={card.radius} min={0} max={24} unit="px" onChange={(v) => p('radius', v)} />
      <ColorField label="强调色" value={card.accent} onChange={(v) => p('accent', v)} />
      <ColorField label="标题色" value={card.titleColor} onChange={(v) => p('titleColor', v)} />
      <ColorField label="次要文字" value={card.mutedColor} onChange={(v) => p('mutedColor', v)} />
      <ColorField label="金额色" value={card.amountColor} onChange={(v) => p('amountColor', v)} />
      <TextField label="阴影" value={card.shadow} onChange={(v) => p('shadow', v)} />
    </div>
  )
}

export function ControlPanel() {
  const draft = useLookWorkshopStore((s) => s.draft)
  const openSection = useLookWorkshopStore((s) => s.openSection)
  const setOpenSection = useLookWorkshopStore((s) => s.setOpenSection)
  const patchPath = useLookWorkshopStore((s) => s.patchPath)
  const mirrorOtherToSelf = useLookWorkshopStore((s) => s.mirrorOtherToSelf)
  const mirrorSelfToOther = useLookWorkshopStore((s) => s.mirrorSelfToOther)

  const toggle = (id: string) => setOpenSection(openSection === id ? '' : id)

  return (
    <div className="lw-panel h-full space-y-2 overflow-y-auto overscroll-contain px-2 pb-8 pt-1.5">
      <PanelCategory label="基础" />
      <Accordion
        id="meta"
        title="皮肤信息"
        subtitle="名称 / 描述 / 作者"
        open={openSection === 'meta'}
        onToggle={toggle}
      >
        <TextField label="名称" value={draft.meta.name} onChange={(v) => patchPath('meta.name', v)} />
        <TextField
          label="描述"
          value={draft.meta.description}
          onChange={(v) => patchPath('meta.description', v)}
        />
        <TextField label="作者" value={draft.meta.author} onChange={(v) => patchPath('meta.author', v)} />
      </Accordion>

      <Accordion
        id="bubble-common"
        title="聊天室与间距"
        subtitle="壁纸 · 消息间距 · 时间戳"
        open={openSection === 'bubble-common'}
        onToggle={toggle}
      >
        <div className="space-y-3">
          <FieldGroup title="消息间距">
            <RangeField
              label="同角色间距"
              value={draft.gapSameSpeakerPx}
              min={0}
              max={20}
              unit="px"
              onChange={(v) => patchPath('gapSameSpeakerPx', v)}
            />
            <RangeField
              label="异角色间距"
              value={draft.gapDifferentSpeakerPx}
              min={4}
              max={28}
              unit="px"
              onChange={(v) => patchPath('gapDifferentSpeakerPx', v)}
            />
            <p className="text-[10px] leading-relaxed text-neutral-400">
              同角色＝连发气泡之间；异角色＝对方与自己切换处。
            </p>
          </FieldGroup>

          <FieldGroup
            title="聊天室背景"
            hint="有背景图时，液态玻璃透视更明显；导出气泡包会写入真机壁纸。"
          >
            <ColorField
              label="背景色（兜底）"
              value={draft.advanced.roomBg}
              onChange={(v) => patchPath('advanced.roomBg', v)}
            />
            <BgImageCropField
              label="背景图"
              value={draft.advanced.roomBgImage}
              aspect={9 / 16}
              title="裁剪聊天室背景"
              hint="竖屏封面"
              maxSide={900}
              onChange={(v) => {
                patchPath('advanced.roomBgImage', v)
                // 大图立刻落盘，避免刷新前 debounce 未完成
                queueMicrotask(() => flushLookWorkshopPersist())
              }}
            />
            {draft.advanced.roomBgImage.trim() ? (
              <button
                type="button"
                className="lw-btn-ghost w-full text-[11px]"
                onClick={() => {
                  patchPath('advanced.roomBgImage', '')
                  queueMicrotask(() => flushLookWorkshopPersist())
                }}
              >
                清除背景图（改回纯色）
              </button>
            ) : null}
          </FieldGroup>

          <FieldGroup title="时间戳样式">
            <ColorField
              label="时间戳背景"
              value={draft.timestamp.bg}
              onChange={(v) => patchPath('timestamp.bg', v)}
            />
            <ColorField
              label="时间戳文字"
              value={draft.timestamp.textColor}
              onChange={(v) => patchPath('timestamp.textColor', v)}
            />
            <RangeField
              label="时间戳圆角"
              value={draft.timestamp.radius}
              min={0}
              max={20}
              unit="px"
              onChange={(v) => patchPath('timestamp.radius', v)}
            />
            <p className="text-[10px] leading-relaxed text-neutral-400">
              时间戳很矮，约 10px 以上就会看起来像完全圆角。
            </p>
            <FontUploadField
              label="时间戳字体"
              value={draft.timestamp.font}
              onChange={(v) => patchPath('timestamp.font', v)}
              previewText="今天 09:41"
            />
          </FieldGroup>
        </div>
      </Accordion>

      <PanelCategory label="气泡与头像" />
      <Accordion
        id="other"
        title="Char 侧气泡"
        subtitle="对方气泡：玻璃 / 渐变 / 角标 / 装饰"
        open={openSection === 'other'}
        onToggle={toggle}
      >
        <button type="button" className="lw-btn-ghost mb-1 w-full" onClick={mirrorOtherToSelf}>
          镜像同步到 User 侧
        </button>
        <p className="mb-2 text-[10px] leading-relaxed text-neutral-400">
          左右对调：贴纸边、内边距、倾斜/渐变/阴影角度；不是原样拷贝。
        </p>
        <BubbleSideFields prefix="other" side={draft.other} />
      </Accordion>

      <Accordion
        id="self"
        title="User 侧气泡"
        subtitle="自己气泡：玻璃 / 渐变 / 角标 / 装饰"
        open={openSection === 'self'}
        onToggle={toggle}
      >
        <button type="button" className="lw-btn-ghost mb-1 w-full" onClick={mirrorSelfToOther}>
          镜像同步到 Char 侧
        </button>
        <p className="mb-2 text-[10px] leading-relaxed text-neutral-400">
          左右对调：贴纸边、内边距、倾斜/渐变/阴影角度；不是原样拷贝。
        </p>
        <BubbleSideFields prefix="self" side={draft.self} />
      </Accordion>

      <Accordion
        id="avatar-other"
        title="Char 侧头像"
        subtitle="对方头像显示与装饰"
        open={openSection === 'avatar-other'}
        onToggle={toggle}
      >
        <AvatarSideFields prefix="other" side={draft.other} />
      </Accordion>

      <Accordion
        id="avatar-self"
        title="User 侧头像"
        subtitle="自己头像显示与装饰"
        open={openSection === 'avatar-self'}
        onToggle={toggle}
      >
        <AvatarSideFields prefix="self" side={draft.self} />
      </Accordion>

      <PanelCategory label="特殊消息" />
      <Accordion
        id="special"
        title="特殊消息卡片"
        subtitle="语音 / 转账 / 红包等"
        open={openSection === 'special'}
        onToggle={toggle}
      >
        <p className="text-[10px] leading-relaxed text-neutral-400">
          可开「跟随普通气泡」以继承对应侧气泡底色与圆角。
        </p>
        <div className="space-y-3">
          <FieldGroup title="语音">
            <SpecialFields prefix="voice" card={draft.voice} />
          </FieldGroup>
          <FieldGroup title="转账">
            <SpecialFields prefix="transfer" card={draft.transfer} />
          </FieldGroup>
          <FieldGroup title="红包">
            <SpecialFields prefix="redPacket" card={draft.redPacket} />
          </FieldGroup>
          <FieldGroup title="位置">
            <SpecialFields prefix="location" card={draft.location} />
          </FieldGroup>
          <FieldGroup title="语音通话">
            <SpecialFields prefix="voiceCall" card={draft.voiceCall} />
          </FieldGroup>
          <FieldGroup title="收藏">
            <SpecialFields prefix="favorite" card={draft.favorite} />
          </FieldGroup>
          <FieldGroup title="听一听">
            <SpecialFields prefix="listenTogether" card={draft.listenTogether} />
          </FieldGroup>
        </div>
      </Accordion>

      <PanelCategory label="聊天框" />
      <Accordion
        id="header"
        title="顶部标题栏"
        subtitle="背景 · 毛玻璃 · 按钮与标题"
        open={openSection === 'header'}
        onToggle={toggle}
      >
        <button
          type="button"
          className="lw-btn-ghost w-full"
          onClick={() =>
            patchPath('header', structuredClone(createDefaultLookWorkshopDraft().header))
          }
        >
          重置标题栏为初始状态
        </button>
        <p className="rounded-lg bg-neutral-50 px-2.5 py-2 text-[10px] leading-relaxed text-neutral-500">
          可在上方预览标题栏内直接拖动：返回、时间、生理检测、更多、昵称、输入状态、角色头像；位置会实时写入下方参数。
        </p>
        <RangeField
          label="整体高度"
          value={draft.header.heightPx}
          min={36}
          max={120}
          unit="px"
          onChange={(v) => patchPath('header.heightPx', v)}
        />
        <SelectField<'color' | 'image'>
          label="标题栏背景"
          value={draft.header.bgMode}
          options={[
            { value: 'color', label: '纯色' },
            { value: 'image', label: '背景图' },
          ]}
          onChange={(v) => {
            patchPath('header.bgMode', v)
            if (v === 'color') {
              patchPath('header.bgImage', '')
              patchPath('header.bgImageBlurPx', 0)
              patchPath('header.bgOverlayOpacity', 0)
            }
          }}
        />
        {draft.header.bgMode === 'color' ? (
          <ColorField label="背景色" value={draft.header.bg} onChange={(v) => patchPath('header.bg', v)} />
        ) : (
          <>
            <BgImageCropField
              label="背景图"
              value={draft.header.bgImage}
              aspect={420 / Math.max(36, draft.header.heightPx)}
              title="裁剪标题栏背景"
              hint="横幅比例，随整体高度变化"
              onChange={(v) => {
                patchPath('header.bgImage', v)
                if (v.trim()) patchPath('header.bgMode', 'image')
              }}
            />
            {draft.header.bgImage.trim() ? (
              <RangeField
                label="背景图模糊"
                value={draft.header.bgImageBlurPx}
                min={0}
                max={24}
                unit="px"
                onChange={(v) => patchPath('header.bgImageBlurPx', v)}
              />
            ) : null}
            <ColorField
              label="遮罩颜色"
              value={draft.header.bgOverlayColor}
              onChange={(v) => patchPath('header.bgOverlayColor', v)}
            />
            <RangeField
              label="遮罩透明度"
              value={draft.header.bgOverlayOpacity}
              min={0}
              max={100}
              unit="%"
              onChange={(v) => patchPath('header.bgOverlayOpacity', v)}
            />
          </>
        )}
        <ToggleField
          label="透视毛玻璃"
          checked={draft.header.useBlur}
          onChange={(v) => patchPath('header.useBlur', v)}
        />
        <RangeField
          label="透视 Blur"
          value={draft.header.blurPx}
          min={0}
          max={40}
          unit="px"
          onChange={(v) => patchPath('header.blurPx', v)}
        />
        <ColorField
          label="标题色"
          value={draft.header.textColor}
          onChange={(v) => patchPath('header.textColor', v)}
        />
        <ColorField
          label="副标题色"
          value={draft.header.mutedColor}
          onChange={(v) => patchPath('header.mutedColor', v)}
        />
        <ColorField
          label="底部分割线"
          value={draft.header.borderColor}
          onChange={(v) => patchPath('header.borderColor', v)}
        />
        <ToggleField
          label="显示副标题"
          checked={draft.header.showSubtitle}
          onChange={(v) => patchPath('header.showSubtitle', v)}
        />
        {draft.header.showSubtitle ? (
          <TextField
            label="副标题文案"
            value={draft.header.subtitleText}
            placeholder="对方正在输入…"
            onChange={(v) => patchPath('header.subtitleText', v)}
          />
        ) : null}
        <RangeField
          label="标题字号"
          value={draft.header.titleSizePx}
          min={12}
          max={20}
          unit="px"
          onChange={(v) => patchPath('header.titleSizePx', v)}
        />
        <FontUploadField
          label="昵称字体"
          value={draft.header.titleFont}
          onChange={(v) => patchPath('header.titleFont', v)}
          previewText="预览对象"
        />
        {draft.header.showSubtitle ? (
          <FontUploadField
            label="输入状态字体"
            value={draft.header.subtitleFont}
            onChange={(v) => patchPath('header.subtitleFont', v)}
            previewText={draft.header.subtitleText.trim() || '对方正在输入…'}
          />
        ) : null}
        {draft.header.titlePos.free ? (
          <>
            <RangeField
              label="昵称 X%"
              value={Math.round(draft.header.titlePos.xPct)}
              min={0}
              max={100}
              unit="%"
              onChange={(v) =>
                patchPath('header.titlePos', { ...draft.header.titlePos, free: true, xPct: v })
              }
            />
            <RangeField
              label="昵称 Y%"
              value={Math.round(draft.header.titlePos.yPct)}
              min={0}
              max={100}
              unit="%"
              onChange={(v) =>
                patchPath('header.titlePos', { ...draft.header.titlePos, free: true, yPct: v })
              }
            />
            <button
              type="button"
              className="w-full rounded-lg bg-neutral-100 px-2.5 py-1.5 text-[11px] font-medium text-neutral-600"
              onClick={() =>
                patchPath('header.titlePos', createDefaultLookWorkshopDraft().header.titlePos)
              }
            >
              重置昵称位置
            </button>
          </>
        ) : null}
        {draft.header.showSubtitle && draft.header.subtitlePos.free ? (
          <>
            <RangeField
              label="状态文案 X%"
              value={Math.round(draft.header.subtitlePos.xPct)}
              min={0}
              max={100}
              unit="%"
              onChange={(v) =>
                patchPath('header.subtitlePos', {
                  ...draft.header.subtitlePos,
                  free: true,
                  xPct: v,
                })
              }
            />
            <RangeField
              label="状态文案 Y%"
              value={Math.round(draft.header.subtitlePos.yPct)}
              min={0}
              max={100}
              unit="%"
              onChange={(v) =>
                patchPath('header.subtitlePos', {
                  ...draft.header.subtitlePos,
                  free: true,
                  yPct: v,
                })
              }
            />
            <button
              type="button"
              className="w-full rounded-lg bg-neutral-100 px-2.5 py-1.5 text-[11px] font-medium text-neutral-600"
              onClick={() =>
                patchPath(
                  'header.subtitlePos',
                  createDefaultLookWorkshopDraft().header.subtitlePos,
                )
              }
            >
              重置状态文案位置
            </button>
          </>
        ) : null}
        <ToggleField
          label="显示角色头像"
          checked={draft.header.showTitleAvatar}
          onChange={(v) => patchPath('header.showTitleAvatar', v)}
        />
        {draft.header.showTitleAvatar ? (
          <>
            {!draft.header.titleAvatarPos.free ? (
              <SelectField<HeaderAvatarPlacement>
                label="头像默认位置"
                value={draft.header.titleAvatarPlacement}
                options={[
                  { value: 'beside', label: '标题左侧' },
                  { value: 'above', label: '标题上方' },
                ]}
                onChange={(v) => patchPath('header.titleAvatarPlacement', v)}
              />
            ) : null}
            <RangeField
              label="头像大小"
              value={draft.header.titleAvatarSizePx}
              min={20}
              max={48}
              unit="px"
              onChange={(v) => patchPath('header.titleAvatarSizePx', v)}
            />
            <RangeField
              label="头像圆角"
              value={draft.header.titleAvatarRadiusPx}
              min={0}
              max={24}
              unit="px"
              onChange={(v) => patchPath('header.titleAvatarRadiusPx', v)}
            />
            {draft.header.titleAvatarPos.free ? (
              <>
                <RangeField
                  label="头像 X%"
                  value={Math.round(draft.header.titleAvatarPos.xPct)}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(v) =>
                    patchPath('header.titleAvatarPos', {
                      ...draft.header.titleAvatarPos,
                      free: true,
                      xPct: v,
                    })
                  }
                />
                <RangeField
                  label="头像 Y%"
                  value={Math.round(draft.header.titleAvatarPos.yPct)}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(v) =>
                    patchPath('header.titleAvatarPos', {
                      ...draft.header.titleAvatarPos,
                      free: true,
                      yPct: v,
                    })
                  }
                />
                <button
                  type="button"
                  className="w-full rounded-lg bg-neutral-100 px-2.5 py-1.5 text-[11px] font-medium text-neutral-600"
                  onClick={() =>
                    patchPath(
                      'header.titleAvatarPos',
                      createDefaultLookWorkshopDraft().header.titleAvatarPos,
                    )
                  }
                >
                  重置头像为默认布局
                </button>
              </>
            ) : null}
          </>
        ) : null}

        <p className="pt-1 text-[10px] font-semibold tracking-wide text-neutral-500">
          顶栏按钮（返回 / 时间 / 生理监测 / 设置，始终显示）
        </p>
        <p className="text-[10px] leading-relaxed text-neutral-400">
          四键不可关闭，保证聊天室功能完整。可上传自定义图标，并单独调整图标尺寸与圆角。
        </p>
        <ColorField
          label="按钮颜色（默认矢量图标）"
          value={draft.header.btnColor || draft.header.textColor}
          onChange={(v) => patchPath('header.btnColor', v)}
        />

        {(
          [
            { key: 'backBtn', label: '返回' },
            { key: 'timeBtn', label: '时间设置' },
            { key: 'psycheBtn', label: '生理监测' },
            { key: 'moreBtn', label: '设置' },
          ] as const
        ).map((row) => {
          const item = draft.header[row.key]
          return (
            <div key={row.key} className="space-y-2 rounded-xl bg-neutral-50/80 p-2">
              <p className="text-[10px] text-neutral-400">{row.label}</p>
              {'side' in item && !item.pos.free ? (
                <SelectField<HeaderBtnSide>
                  label="默认所在侧"
                  value={item.side}
                  options={[
                    { value: 'left', label: '左侧（返回旁）' },
                    { value: 'right', label: '右侧（设置旁）' },
                  ]}
                  onChange={(v) => patchPath(`header.${row.key}.side`, v)}
                />
              ) : null}
              <RangeField
                label="按钮热区"
                value={item.sizePx}
                min={28}
                max={44}
                unit="px"
                onChange={(v) => patchPath(`header.${row.key}.sizePx`, v)}
              />
              <ImageUploadField
                label="自定义图标"
                hint="空则用默认矢量；上传后覆盖默认图标"
                previewRadiusPx={item.iconRadiusPx}
                value={item.iconDataUrl}
                onChange={(dataUrl) => patchPath(`header.${row.key}.iconDataUrl`, dataUrl)}
              />
              <RangeField
                label="图标尺寸"
                value={item.iconSizePx}
                min={14}
                max={36}
                unit="px"
                onChange={(v) => patchPath(`header.${row.key}.iconSizePx`, v)}
              />
              <RangeField
                label="图标圆角"
                value={item.iconRadiusPx}
                min={0}
                max={24}
                unit="px"
                onChange={(v) => patchPath(`header.${row.key}.iconRadiusPx`, v)}
              />
              {item.pos.free ? (
                <>
                  <RangeField
                    label="X%"
                    value={Math.round(item.pos.xPct)}
                    min={0}
                    max={100}
                    unit="%"
                    onChange={(v) =>
                      patchPath(`header.${row.key}.pos`, {
                        ...item.pos,
                        free: true,
                        xPct: v,
                      })
                    }
                  />
                  <RangeField
                    label="Y%"
                    value={Math.round(item.pos.yPct)}
                    min={0}
                    max={100}
                    unit="%"
                    onChange={(v) =>
                      patchPath(`header.${row.key}.pos`, {
                        ...item.pos,
                        free: true,
                        yPct: v,
                      })
                    }
                  />
                  <button
                    type="button"
                    className="w-full rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-medium text-neutral-600 ring-1 ring-black/6"
                    onClick={() =>
                      patchPath(
                        `header.${row.key}.pos`,
                        createDefaultLookWorkshopDraft().header[row.key].pos,
                      )
                    }
                  >
                    重置为默认布局
                  </button>
                </>
              ) : (
                <p className="text-[10px] text-neutral-400">在预览标题栏拖动此按钮可自由定位</p>
              )}
            </div>
          )
        })}
      </Accordion>

      <Accordion
        id="input"
        title="底部输入栏"
        subtitle="栏背景 · 输入壳 · 按钮图标"
        open={openSection === 'input'}
        onToggle={toggle}
      >
        <ColorField label="栏背景色" value={draft.input.barBg} onChange={(v) => patchPath('input.barBg', v)} />
        <BgImageCropField
          label="栏背景图"
          value={draft.input.barBgImage}
          aspect={420 / 64}
          title="裁剪输入栏背景"
          hint="横幅比例"
          onChange={(v) => patchPath('input.barBgImage', v)}
        />
        {draft.input.barBgImage.trim() ? (
          <RangeField
            label="背景图模糊"
            value={draft.input.barBgImageBlurPx}
            min={0}
            max={24}
            unit="px"
            onChange={(v) => patchPath('input.barBgImageBlurPx', v)}
          />
        ) : null}
        <ColorField
          label="遮罩颜色"
          value={draft.input.barBgOverlayColor}
          onChange={(v) => patchPath('input.barBgOverlayColor', v)}
        />
        <RangeField
          label="遮罩透明度"
          value={draft.input.barBgOverlayOpacity}
          min={0}
          max={100}
          unit="%"
          onChange={(v) => patchPath('input.barBgOverlayOpacity', v)}
        />
        <ColorField
          label="顶部分割线"
          value={draft.input.barBorder}
          onChange={(v) => patchPath('input.barBorder', v)}
        />
        <ToggleField
          label="透视毛玻璃"
          checked={draft.input.useBlur}
          onChange={(v) => patchPath('input.useBlur', v)}
        />
        <RangeField
          label="透视 Blur"
          value={draft.input.blurPx}
          min={0}
          max={40}
          unit="px"
          onChange={(v) => patchPath('input.blurPx', v)}
        />
        <ColorField
          label="输入壳背景"
          value={draft.input.shellBg}
          onChange={(v) => patchPath('input.shellBg', v)}
        />
        <ColorField
          label="输入壳边框"
          value={draft.input.shellBorder}
          onChange={(v) => patchPath('input.shellBorder', v)}
        />
        <RangeField
          label="输入壳圆角"
          value={draft.input.shellRadius}
          min={0}
          max={28}
          unit="px"
          onChange={(v) => patchPath('input.shellRadius', v)}
        />
        <ColorField
          label="文字色"
          value={draft.input.textColor}
          onChange={(v) => patchPath('input.textColor', v)}
        />
        <ColorField
          label="占位色"
          value={draft.input.placeholderColor}
          onChange={(v) => patchPath('input.placeholderColor', v)}
        />
        <ColorField
          label="按钮色"
          value={draft.input.btnColor}
          onChange={(v) => patchPath('input.btnColor', v)}
        />
        <RangeField
          label="上下内边距"
          value={draft.input.padY}
          min={4}
          max={16}
          unit="px"
          onChange={(v) => patchPath('input.padY', v)}
        />

        <p className="pt-1 text-[10px] font-semibold tracking-wide text-neutral-500">按钮图标</p>
        <ToggleField
          label="调整尺寸/圆角时同步其他按钮"
          checked={draft.input.btnIconSyncStyle}
          onChange={(v) => patchPath('input.btnIconSyncStyle', v)}
        />
        {INPUT_BTN_ICON_ROWS.map((row) => {
          const icon = draft.input.btnIcons[row.key]
          const patchIcon = (next: InputBtnIconDraft) => {
            if (draft.input.btnIconSyncStyle) {
              const synced = syncBtnIconStyleToAll(draft.input.btnIcons, next)
              synced[row.key] = next
              patchPath('input.btnIcons', synced)
              return
            }
            patchPath(`input.btnIcons.${row.key}`, next)
          }
          return (
            <div key={row.key} className="space-y-2 rounded-xl bg-neutral-50/80 p-2">
              <ImageUploadField
                label={row.label}
                previewRadiusPx={icon.radiusPx}
                value={icon.dataUrl}
                onChange={(dataUrl) => patchIcon({ ...icon, dataUrl })}
              />
              <RangeField
                label="尺寸"
                value={icon.sizePx}
                min={16}
                max={28}
                unit="px"
                onChange={(sizePx) => patchIcon({ ...icon, sizePx })}
              />
              <RangeField
                label="圆角"
                value={icon.radiusPx}
                min={0}
                max={24}
                unit="px"
                onChange={(radiusPx) => patchIcon({ ...icon, radiusPx })}
              />
              {!draft.input.btnIconSyncStyle ? (
                <button
                  type="button"
                  className="w-full rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-medium text-neutral-600 ring-1 ring-black/6"
                  onClick={() =>
                    patchPath('input.btnIcons', syncBtnIconStyleToAll(draft.input.btnIcons, icon))
                  }
                >
                  同步此尺寸/圆角到其他按钮
                </button>
              ) : null}
            </div>
          )
        })}
      </Accordion>
    </div>
  )
}
