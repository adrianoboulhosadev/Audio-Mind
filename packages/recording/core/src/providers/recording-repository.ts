import { Recording } from '../model'

/** Recording WRITE port (command side of CQRS). Trades the rich entity. */
export interface RecordingRepository {
  create(recording: Recording): Promise<void>
  findById(id: string): Promise<Recording | null>
  update(recording: Recording): Promise<void>
  delete(id: string): Promise<void>
}
