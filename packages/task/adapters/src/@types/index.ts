/** The one payload this context takes from a client: ticking a task, or putting
 * it back. Everything else it holds was written by the pipeline. */
export interface SetTaskDoneInput {
  done: boolean
}
