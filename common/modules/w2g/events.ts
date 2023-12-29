export type EventData<T> = Omit<T, 'type'>

export class SyncEventBase {
  type: string

  constructor (type: string) {
    this.type = type
  }
}

export class SessionInitEvent extends SyncEventBase {
  static type: 'init' = 'init'

  id: string | number
  name: string | undefined

  mediaListOptions: {
    animeList: {
      customLists: string[]
    }
  } | undefined

  avatar: {
    medium: string
  }

  constructor (id: string, user: Partial<EventData<SessionInitEvent>>) {
    super(SessionInitEvent.type)
    this.id = user?.id ?? id
    this.name = user.name
    this.mediaListOptions = user.mediaListOptions
    this.avatar = user.avatar
  }
}

export class MagnetLinkEvent extends SyncEventBase {
  static type: 'magnet' = 'magnet'

  magnet: unknown
  hash: string

  constructor (magnet: EventData<MagnetLinkEvent>) {
    super(MagnetLinkEvent.type)
    this.hash = magnet.hash
    this.magnet = magnet.magnet
  }
}

export class MediaIndexEvent extends SyncEventBase {
  static type: 'index' = 'index'

  index: number

  constructor (index: number) {
    super(MediaIndexEvent.type)
    this.index = index
  }
}

export class PlayerStateEvent extends SyncEventBase {
  static type: 'player' = 'player'

  time: number
  paused: boolean

  constructor (state: EventData<PlayerStateEvent>) {
    super(PlayerStateEvent.type)
    this.time = state.time
    this.paused = state.paused
  }
}

export type MsgData =
  | { type: typeof PlayerStateEvent.type } & PlayerStateEvent
  | { type: typeof MediaIndexEvent.type } & MediaIndexEvent
  | { type: typeof MagnetLinkEvent.type } & MagnetLinkEvent
  | { type: typeof SessionInitEvent.type } & SessionInitEvent
