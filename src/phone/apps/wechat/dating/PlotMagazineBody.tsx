import { useMemo, useRef } from 'react'
import { PlotImageTile } from './PlotImageTile'
import { buildPlotMagazineSegments } from './plotMagazineLayout'
import { PlotRichParagraph } from './plotRichText'
import type { PlotDialogueTranslation, PlotImageItem } from './types'

type Props = {
  content: string
  plotImages?: PlotImageItem[]
  characterId: string
  plotId: string
  dialogueTranslations?: PlotDialogueTranslation[]
  innerOsTranslations?: PlotDialogueTranslation[]
  onBackfillMissingTranslations?: () => void
  onRegenerateForMissingTranslation?: () => void
  backfillBusy?: boolean
}

export function PlotMagazineBody({
  content,
  plotImages,
  characterId,
  plotId,
  dialogueTranslations,
  innerOsTranslations,
  onBackfillMissingTranslations,
  onRegenerateForMissingTranslation,
  backfillBusy,
}: Props) {
  const segments = useMemo(
    () => buildPlotMagazineSegments(content, plotImages ?? []),
    [content, plotImages],
  )
  const dialogueIndexRef = useRef(0)
  const innerOsIndexRef = useRef(0)
  dialogueIndexRef.current = 0
  innerOsIndexRef.current = 0

  return (
    <div className="text-[16px] font-normal leading-[1.85] text-[#262626]">
      {segments.map((seg, index) => {
        if (seg.type === 'image') {
          return (
            <div key={seg.image.id} className="my-3 w-full">
              <PlotImageTile
                image={seg.image}
                characterId={characterId}
                plotId={plotId}
                variant="block"
              />
            </div>
          )
        }
        return (
          <p
            key={`text-${index}`}
            className="mb-[0.65em] whitespace-pre-wrap break-words last:mb-0"
          >
            <PlotRichParagraph
              content={seg.content}
              className="inline"
              dialogueTranslations={dialogueTranslations}
              innerOsTranslations={innerOsTranslations}
              dialogueIndexRef={dialogueIndexRef}
              innerOsIndexRef={innerOsIndexRef}
              onBackfillMissingTranslations={onBackfillMissingTranslations}
              onRegenerateForMissingTranslation={onRegenerateForMissingTranslation}
              backfillBusy={backfillBusy}
            />
          </p>
        )
      })}
    </div>
  )
}
