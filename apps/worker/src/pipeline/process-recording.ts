import { RecordingFacade } from '@recording/adapters'
import { SummaryFacade } from '@summary/adapters'
import { TranscriptionFacade } from '@transcription/adapters'
import { resolveUploadPath } from '../pdf/uploads-path'
import { failureReasonFor } from './failure-reason'

export interface ProcessRecordingDeps {
  recordings: RecordingFacade
  transcriptions: TranscriptionFacade
  summaries: SummaryFacade
  /** Language the summary is WRITTEN in — the audio's is detected by the model. */
  summaryLanguage: string
}

/**
 * The whole pipeline for one audio: transcribe, summarize, render the PDF, mark
 * it ready. Written as a plain function over the three FACADES (never over a use
 * case or a core), so what it reads like is the actual order of the product.
 *
 * RESUMABLE, because a queue redelivers: if the process died after the
 * transcript was stored, the recording is already `summarizing` and re-running
 * the model over the same audio would burn minutes and money for the same text.
 * So the stored status decides where to pick up — and every transition below is
 * still enforced by the entity, which is what keeps a stage from being skipped.
 *
 * FAILURE IS A STATE, not a log line: anything that throws is written back onto
 * the recording with a reason the owner can act on (see failureReasonFor), which
 * also raises the event that puts a line in their inbox. A recording must never
 * be left sitting on "transcribing" forever with the cause visible only in a log
 * nobody reads.
 */
export async function processRecording(
  recordingId: string,
  deps: ProcessRecordingDeps,
): Promise<void> {
  const { recordings, transcriptions, summaries, summaryLanguage } = deps

  try {
    const recording = await recordings.getRecordingForProcessing(recordingId)

    // Already finished — a duplicated job is a no-op, not a re-run.
    if (recording.status === 'ready') return

    // `summarizing` means the transcript is already stored: picking up from
    // there is the whole point of reading the status first.
    if (recording.status !== 'summarizing') {
      await recordings.startTranscription(recordingId)
      await transcriptions.transcribeRecording({
        recordingId,
        audioPath: resolveUploadPath(recording.audioUrl),
        mimeType: recording.mimeType,
      })
    }

    await recordings.startSummarization(recordingId)

    const transcription = await transcriptions.getTranscription(recordingId)
    await summaries.summarizeTranscript({
      recordingId,
      recordingTitle: recording.title,
      transcript: transcription.text,
      language: summaryLanguage,
    })

    // The summary knows what the audio was about, so an audio nobody named gets
    // named here. The entity refuses the suggestion when the person typed a
    // title, and the recording is re-read because the command answers no value
    // (CQRS) — and the PDF should carry the FINAL title, not the placeholder.
    const summary = await summaries.getSummary(recordingId)
    await recordings.suggestRecordingTitle(recordingId, summary.headline)
    const named = await recordings.getRecordingForProcessing(recordingId)

    // The PDF is rendered before the recording is called ready, so "pronto" in
    // the inbox never links to a summary whose download button does nothing.
    await summaries.renderSummaryPdf(recordingId, named.title)

    await recordings.completeRecording(recordingId)
  } catch (error) {
    console.error(`[worker] pipeline failed for recording ${recordingId}:`, error)
    // Marking the failure is also what notifies the owner (the entity records
    // RecordingFailed). If THIS fails too there is nothing left to do but let
    // the job fail loudly.
    await recordings.failRecording(recordingId, failureReasonFor(error))
  }
}
