/**
 * 主屏左侧账号页占位：真正内容走全屏路由（PhoneApp userAccount）。
 * 保留此页是为了支持「主屏向右滑」的翻页手势与页点。
 */
export function HomeAccountCenterPage(_props?: {
  onBackToHome?: () => void
  onAuthChange?: () => void
}) {
  return (
    <div
      data-home-account-page="true"
      className="relative flex h-full min-h-0 w-full flex-col items-center justify-center bg-[#f7f7f8]"
    >
      <p className="text-[13px] text-[#8e8e93]">正在打开账号中心…</p>
    </div>
  )
}
