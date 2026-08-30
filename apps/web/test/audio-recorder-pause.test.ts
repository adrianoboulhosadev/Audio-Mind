import { act, renderHook } from '@testing-library/react'
import { useAudioRecorder, type RecordedAudio } from '@/components/audio-recorder/hooks/use-audio-recorder'

/**
 * A gravação é cronometrada pelo RELÓGIO — um WebM do MediaRecorder não carrega
 * duração no header, então a duração enviada é a que a gente contou.
 *
 * Pausar quebra isso silenciosamente: o recorder pausado não escreve áudio, mas
 * o relógio continua andando. Sem descontar o tempo parado, um intervalo de café
 * viraria minutos de duração num arquivo que não os tem — e nada no build, no
 * type-check ou na tela denunciaria. É exatamente a classe de bug que os testes
 * deste app existem pra pegar.
 */

class FakeMediaRecorder {
  static isTypeSupported = () => true

  state: 'inactive' | 'recording' | 'paused' = 'inactive'
  mimeType = 'audio/webm'
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null

  constructor(readonly stream: MediaStream) {}

  start() {
    this.state = 'recording'
  }
  pause() {
    this.state = 'paused'
  }
  resume() {
    this.state = 'recording'
  }
  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['audio'], { type: this.mimeType }) })
    this.onstop?.()
  }
}

beforeAll(() => {
  Object.defineProperty(global.navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: async () => ({ getTracks: () => [] }) as unknown as MediaStream },
  })
  ;(global as unknown as { MediaRecorder: unknown }).MediaRecorder = FakeMediaRecorder
})

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

async function record(): Promise<{
  finished: RecordedAudio[]
  result: { current: ReturnType<typeof useAudioRecorder> }
}> {
  const finished: RecordedAudio[] = []
  const { result } = renderHook(() => useAudioRecorder((audio) => finished.push(audio)))

  await act(async () => {
    await result.current.start()
  })

  return { finished, result }
}

test('o tempo PAUSADO não entra na duração da gravação', async () => {
  const { finished, result } = await record()

  act(() => {
    jest.advanceTimersByTime(10_000)
  })
  expect(result.current.seconds).toBe(10)

  act(() => result.current.togglePause())
  act(() => {
    jest.advanceTimersByTime(30_000)
  })
  // Parado é parado: o cronômetro na tela não anda, porque o arquivo não cresce.
  expect(result.current.paused).toBe(true)
  expect(result.current.seconds).toBe(10)

  act(() => result.current.togglePause())
  act(() => {
    jest.advanceTimersByTime(5_000)
  })
  expect(result.current.seconds).toBe(15)

  act(() => result.current.stop())

  // 45 segundos de relógio, 15 de áudio — é o número do ARQUIVO que vai junto.
  expect(finished).toHaveLength(1)
  expect(finished[0].durationSeconds).toBe(15)
})

test('sem pausa nenhuma, a duração é o relógio inteiro', async () => {
  const { finished, result } = await record()

  act(() => {
    jest.advanceTimersByTime(8_000)
  })
  act(() => result.current.stop())

  expect(finished[0].durationSeconds).toBe(8)
})
