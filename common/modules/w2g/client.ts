import P2PT, { type Peer } from 'p2pt'
import { generateRandomHexCode } from '../util.js'
import { alID } from '../anilist.js'
import { MediaIndexEvent, SessionInitEvent, PlayerStateEvent, MagnetLinkEvent, type EventData, SyncEventBase, type MsgData } from './events'
import { add } from '../torrent.js'
import { W2GSession } from './session'

export class W2GClient {
  static #announce = [
    atob('d3NzOi8vdHJhY2tlci5vcGVud2VidG9ycmVudC5jb20='),
    atob('d3NzOi8vdHJhY2tlci53ZWJ0b3JyZW50LmRldg=='),
    atob('d3NzOi8vdHJhY2tlci5maWxlcy5mbTo3MDczL2Fubm91bmNl'),
    atob('d3NzOi8vdHJhY2tlci5idG9ycmVudC54eXov')
  ]

  #session
  #p2pt
  #code

  get code () {
    return this.#code
  }

  constructor (session: W2GSession, code: string) {
    this.#session = session
    this.#session.isHost = !code

    code ??= generateRandomHexCode(16)
    this.#code = code

    this.#p2pt = new P2PT(W2GClient.#announce, this.#code)

    this.#wireEvents()
    this.#p2pt.start()
  }

  onMagnetLink (magnet: EventData<MagnetLinkEvent>) {
    this.#emit(new MagnetLinkEvent(magnet))
  }

  onMediaIndexChanged (index: number) {
    this.#emit(new MediaIndexEvent(index))
  }

  onPlayerStateChanged (state: EventData<PlayerStateEvent>) {
    this.#emit(new PlayerStateEvent(state))
  }

  #wireEvents () {
    this.#p2pt.on('peerconnect', this.#onPeerconnect.bind(this))
    this.#p2pt.on('msg', this.#onMsg.bind(this))
    this.#p2pt.on('peerclose', this.#onPeerclose.bind(this))
  }

  #sendEvent (peer: Peer, event: SyncEventBase) {
    console.log('out W2GMsg', event)
    this.#p2pt?.send(peer, JSON.stringify(event))
  }

  /**
   * Should be called only on 'peerconnect'
   */
  #sendInitialSessionState (peer: Peer, state: W2GSession) {
    this.#sendEvent(peer, new MagnetLinkEvent(state.magnet))
    this.#sendEvent(peer, new MediaIndexEvent(state.index))
    this.#sendEvent(peer, new PlayerStateEvent(state.player))
  }

  async #onPeerconnect (peer: Peer) {
    const user = (await alID)?.data?.Viewer || {}

    this.#sendEvent(peer, new SessionInitEvent(user.id || generateRandomHexCode(16), user))

    if (this.#session.isHost) this.#sendInitialSessionState(peer, this.#session)
  }

  #onMsg (peer: Peer, data: MsgData) {
    data = typeof data === 'string' ? JSON.parse(data) : data

    console.log('in W2GMsg', data)

    switch (data.type) {
      case SessionInitEvent.type:
        this.#session.peers[peer.id] = {
          peer,
          user: data
        }
        this.#session.onPeerListUpdated?.(this.#session.peers)
        break
      case MagnetLinkEvent.type: {
        const { hash, magnet } = data
        if (hash !== this.#session.magnet?.hash) {
          this.#session.isHost = false
          add(magnet)
        }

        break
      }
      case MediaIndexEvent.type: {
        this.#session.onMediaIndexUpdated?.(data.index)
        break
      }
      case PlayerStateEvent.type: {
        this.#session.onPlayerStateUpdated?.(data)
        break
      }
      default:
        console.error('Invalid message type', data)
    }
  }

  #onPeerclose (peer: Peer) {
    delete this.#session.peers[peer.id]
    this.#session.onPeerListUpdated?.(this.#session.peers)
  }

  #emit (event: SyncEventBase) {
    if (!this.#p2pt) return

    // @ts-ignore
    for (const { peer } of Object.values(this.#session.peers)) {
      this.#sendEvent(peer, event)
    }
  }

  dispose () {
    this.#p2pt.destroy()
    this.#p2pt = null
  }
}
