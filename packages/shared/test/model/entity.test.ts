import { AggregateRoot, DomainEvent, Entity, EntityProps, Id } from '../../src'

interface SampleProps extends EntityProps {
  label?: string
}

class Sample extends Entity<Sample, SampleProps> {
  readonly label: string

  constructor(props: SampleProps) {
    super(props)
    this.label = props.label ?? ''
  }
}

class SampleHappened extends DomainEvent {
  constructor(readonly sampleId: string) {
    super()
  }
}

class SampleAggregate extends AggregateRoot<SampleAggregate, SampleProps> {
  happen(): void {
    this.record(new SampleHappened(this.id.value))
  }
}

describe('Entity', () => {
  it('gets a fresh id when the props carry none', () => {
    expect(Id.isValid(new Sample({}).id.value)).toBe(true)
  })

  it('compares by identity, not by the other fields', () => {
    const id = Id.create()
    expect(new Sample({ id, label: 'a' }).equals(new Sample({ id, label: 'b' }))).toBe(true)
    expect(new Sample({ label: 'a' }).equals(new Sample({ label: 'a' }))).toBe(false)
  })

  it('clone returns the concrete subclass with the props overridden', () => {
    const original = new Sample({ label: 'antes' })
    const clone = original.clone({ label: 'depois' })
    expect(clone).toBeInstanceOf(Sample)
    expect(clone.label).toBe('depois')
    expect(clone.id.value).toBe(original.id.value)
  })
})

describe('AggregateRoot', () => {
  it('pullDomainEvents DRAINS the list — the second call comes back empty', () => {
    const aggregate = new SampleAggregate({})
    aggregate.happen()

    expect(aggregate.pullDomainEvents()).toHaveLength(1)
    expect(aggregate.pullDomainEvents()).toHaveLength(0)
  })

  it('a reconstituted (cloned) aggregate starts with no event — only a transition in the current execution raises a fact', () => {
    const aggregate = new SampleAggregate({})
    aggregate.happen()

    expect(aggregate.clone({}).pullDomainEvents()).toHaveLength(0)
  })
})
