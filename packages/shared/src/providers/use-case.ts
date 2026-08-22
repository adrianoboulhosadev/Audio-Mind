/**
 * Base contract of every application-layer use case.
 * Receives the input and returns the output; the ports (dependencies) are
 * injected through the constructor of the class that implements this interface.
 */
export interface UseCase<INPUT, OUTPUT> {
  execute(input: INPUT, ...args: unknown[]): Promise<OUTPUT>
}
