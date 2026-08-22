import { Id } from './id'

export interface EntityProps {
  id?: string
}

/**
 * Base of every rich domain ENTITY (the difference from an anemic model). Holds
 * an Id and the raw props; concrete entities layer value objects and behavior on
 * top and enforce their invariants in the constructor / mutator methods.
 *
 * `clone` rebuilds the concrete subclass with overridden props — used for
 * immutable-style updates that still return the right runtime type.
 */
export abstract class Entity<TEntity, Props extends EntityProps> {
  readonly id: Id
  readonly props: Props

  constructor(props: Props) {
    this.id = new Id(props.id)
    this.props = { ...props, id: this.id.value }
  }

  equals(other?: Entity<TEntity, Props>): boolean {
    return !!other && this.id.equals(other.id)
  }

  notEquals(other?: Entity<TEntity, Props>): boolean {
    return !this.equals(other)
  }

  clone(newProps: Partial<Props>): TEntity {
    const Constructor = this.constructor as new (props: Props) => TEntity
    return new Constructor({ ...this.props, ...newProps })
  }
}
