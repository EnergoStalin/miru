type Filter<T> = (event: T, lastEvent: T) => boolean
type Sink<T> = (e: T) => unknown

export class BidirectionalFilteredEventBus<InEvent, OutEvent> {
  #lastInEvent: string
  #lastOutEvent: string

  get isFirstInFired () {
    return this.#lastInEvent !== '{}'
  }

  get isFirstOutFired () {
    return this.#lastOutEvent !== '{}'
  }

  #inFilter
  #outFilter

  #inSink
  #outSink

  constructor (
    inSink: Sink<InEvent>,
    outSink: Sink<OutEvent>,
    inFilter: Filter<InEvent>,
    outFilter: Filter<OutEvent>
  ) {
    this.#inSink = inSink
    this.#outSink = outSink
    this.#inFilter = inFilter
    this.#outFilter = outFilter
    this.reinit()
  }

  #drop (
    event: InEvent | OutEvent,
    hash: string,
    lastEvent: string,
    filter: Filter<InEvent | OutEvent>
  ) {
    return filter?.(event, JSON.parse(lastEvent)) || hash === this.#lastOutEvent || hash === this.#lastInEvent
  }

  #filter (
    event: InEvent | OutEvent,
    lastEvent: string,
    sink: Sink<InEvent | OutEvent>,
    filter: Filter<InEvent | OutEvent>
  ) {
    const hash = JSON.stringify(event)

    if (this.#drop(event, hash, lastEvent, filter)) {
      console.log('Dropped', event)
      return hash
    }

    console.log('Passed', event)
    sink?.(event)

    return hash
  }

  in (event: InEvent) {
    console.log('IN', event)
    this.#lastInEvent = this.#filter(event, this.#lastInEvent, this.#inSink, this.#inFilter)
  }

  out (event: OutEvent) {
    console.log('OUT', event)
    this.#lastOutEvent = this.#filter(event, this.#lastOutEvent, this.#outSink, this.#outFilter)
  }

  reinit () {
    this.#lastInEvent = '{}'
    this.#lastOutEvent = '{}'
  }
}
