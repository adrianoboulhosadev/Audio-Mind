/**
 * Outbound port for the processing pipeline. The upload only PARKS the job:
 * transcribing and summarizing take real seconds to minutes, so doing them
 * inside the HTTP request would hold the connection open and lose everything if
 * it dropped.
 *
 * Implemented in apps/backend by a BullMQ producer; consumed by apps/worker.
 * Optional in the use cases' constructors, same as any other port.
 */
export interface RecordingProcessingQueue {
  enqueue(recordingId: string): Promise<void>
}
