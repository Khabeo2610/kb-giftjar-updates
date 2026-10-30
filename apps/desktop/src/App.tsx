import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useAppStore } from './store/appStore';
import { useApplyTheme } from './lib/theme';
import { useGlobalHotkeys } from './lib/useGlobalHotkeys';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { SearchPalette } from './components/layout/SearchPalette';
import { Onboarding } from './components/layout/Onboarding';
import { MiniController } from './components/layout/MiniController';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { ToastViewport } from './components/ui/overlays';
import { DashboardScreen } from './features/dashboard/DashboardScreen';
import { MediaCenterScreen } from './features/media/MediaCenterScreen';
import { GiftStudioScreen } from './features/gifts/GiftStudioScreen';
import { StreamDeckScreen } from './features/deck/StreamDeckScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { PlannedScreen } from './features/planned/PlannedScreen';
import { NowPlayingBar } from './features/media/NowPlaying';
import type { ScreenId } from './data/screens';

function Screen({ id }: { id: ScreenId }) {
  switch (id) {
    case 'dashboard':
      return <DashboardScreen />;
    case 'media':
      return <MediaCenterScreen />;
    case 'gifts':
      return <GiftStudioScreen />;
    case 'deck':
      return <StreamDeckScreen />;
    case 'settings':
      return <SettingsScreen />;
    default:
      return <PlannedScreen id={id} />;
  }
}

export function App() {
  const screen = useAppStore((s) => s.screen);
  const { reducedMotion } = useApplyTheme();
  useGlobalHotkeys();

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
      <div className="flex h-full overflow-hidden bg-bg text-ink">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={screen}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="mx-auto max-w-[1500px]"
              >
                <ErrorBoundary resetKey={screen}>
                  <Screen id={screen} />
                </ErrorBoundary>
              </motion.div>
            </AnimatePresence>
          </main>
          <NowPlayingBar />
        </div>
      </div>
      <MiniController />
      <SearchPalette />
      <Onboarding />
      <ToastViewport />
    </MotionConfig>
  );
}
