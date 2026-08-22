import { v4 as uuidV4, validate as uuidValidate } from 'uuid'

/**
 * Domain identifier. Small kernel utility — the only lib allowed in the domain
 * (uuid). It is not a rich entity; it only generates/validates ids.
 */
export class Id {
  readonly value: string

  constructor(value?: string) {
    this.value = value ?? uuidV4()

    if (!Id.isValid(this.value)) {
      throw new Error(`Invalid id: ${this.value}`)
    }
  }

  /** Generates a new id (uuid v4) already as a string — typical use in the use cases. */
  static create(): string {
    return uuidV4()
  }

  static isValid(value: string): boolean {
    return uuidValidate(value)
  }

  equals(other?: Id): boolean {
    return !!other && this.value === other.value
  }

  notEquals(other?: Id): boolean {
    return !this.equals(other)
  }
}
