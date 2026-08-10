import { GlobalGestureEffects } from './components/GlobalGestureEffects'
import { CustomizationProvider } from './phone/CustomizationContext'
import { RootErrorBoundary } from './phone/components/RootErrorBoundary'
import { PhoneApp } from './phone/PhoneApp'
import { WidgetGalleryProvider } from './phone/widgetGallery'

function App() {
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
