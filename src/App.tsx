import { GlobalGestureEffects } from './components/GlobalGestureEffects'
import { CustomizationProvider } from './phone/CustomizationContext'
import { RootErrorBoundary } from './phone/components/RootErrorBoundary'
import { PhoneApp } from './phone/PhoneApp'
import { WidgetGalleryProvider } from './phone/widgetGallery'
import { StoryRpgPage } from './storyRpg'
import { TheaterEggCatalogPage } from './theaterEgg'

const search =
  typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
const storyRpgPreview = search?.get('storyRpg') === '1'
const theaterEggPreview = search?.get('theaterEgg') === '1'

function App() {
  if (theaterEggPreview) {
    return (
      <RootErrorBoundary>
        <TheaterEggCatalogPage />
      </RootErrorBoundary>
    )
  }

  if (storyRpgPreview) {
    return (
      <RootErrorBoundary>
        <StoryRpgPage fullViewport />
      </RootErrorBoundary>
    )
  }

  return (
    <RootErrorBoundary>
      <CustomizationProvider>
        <WidgetGalleryProvider>
          <PhoneApp />
          <GlobalGestureEffects />
        </WidgetGalleryProvider>
      </CustomizationProvider>
    </RootErrorBoundary>
  )
}

export default App
