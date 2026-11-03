/** 拉黑联系人：备注名旁红色圆底感叹号 */

export function WeChatBlockedContactBadge({
  className = '',
  title = '已拉黑',
}: {
  className?: string
  title?: string
}) {
  return (
    <span
      className={`inline-flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold leading-none ${className}`}
      style={{ background: '#FA5151', color: '#fff' }}
      title={title}
      aria-label={title}
    >
      !
    </span>
  )
}
