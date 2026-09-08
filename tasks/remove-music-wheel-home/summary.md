# Task: Remove desktop MusicWidget and WheelWidget from HomeScreen

## Result
Edited `src/phone/components/HomeScreen.tsx` only.

- Removed MusicWidget / WheelWidget imports, render blocks, long-press/drag state, and drag-ghost branches.
- Layout persistence bumped to `FREE_HOME_LAYOUT_VERSION = 3` with only `profileAnchor` + `slots`.
- Old v2 storage migrates by keeping profileAnchor + slots and ignoring music/wheel.
- Default icon slots occupy the first two rows of the desktop 4×4 band.
- PersonalCard edit drag, icon drag, home swipe, and HomeWidgetGalleryPage left intact.
