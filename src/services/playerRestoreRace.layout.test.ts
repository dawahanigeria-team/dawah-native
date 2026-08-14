import fs from 'fs'
import path from 'path'

const providerSource = fs.readFileSync(
  path.join(process.cwd(), 'src/components/providers/AudioProvider.tsx'),
  'utf8',
)
const storeSource = fs.readFileSync(
  path.join(process.cwd(), 'src/stores/playerStore.ts'),
  'utf8',
)

test('startup queue restoration yields to a newer listener selection', () => {
  expect(providerSource).toContain('const restoreRequestId = getPlaybackRequestId()')
  expect(providerSource).toContain('stopSupersededRestoration()')
  expect(storeSource).toContain('const requestId = beginPlaybackRequest()')
  expect(storeSource).toContain('waitForPlaybackReady(PLAYBACK_START_TIMEOUT_MS, requestId)')
})
