import type { Peer } from 'p2pt'
import { W2GClient } from './client'
import type { EventData, MagnetLinkEvent, PlayerStateEvent } from './events'

type PeerList = Record<string, {
  user: any,
  peer: Peer
}>

export class W2GSession {
  #player: EventData<PlayerStateEvent> = {
    paused: true,
    time: 0
  }

  get player () {
    return this.#player
  }

  #index = 0

  get index () {
    return this.#index
  }

  #magnet: EventData<MagnetLinkEvent> = null

  get magnet () {
    return this.#magnet
  }

  #isHost = false

  get isHost () {
    return this.#isHost
  }

  set isHost (v) {
    this.#isHost = v
  }

  #peers: PeerList = {}

  get peers () {
    return this.#peers
  }

  #client: W2GClient | null
  /**
   * @returns Wether client initialized or not
   */
  get initializated () {
    return this.#client !== null
  }

  /**
   * @returns Invite link ready to be copied
   */
  get inviteLink () {
    return `https://miru.watch/w2g/${this.#client.code}`
  }

  /**
   * Creates client initializing connection
   * @param {string | null} code initial code if null new generated and returned
   * @returns p2p code
   */
  createClient (code: string | null): string {
    this.#client = new W2GClient(this, code)

    return this.#client.code
  }

  /**
   * Disposes inner client and some session properties
   */
  dispose () {
    this.#client?.dispose()
    this.#client = null
    this.#isHost = false
    this.#peers = {}
  }

  // #region Compatibility events

  /**
   * Fires when peer object updated. On 'peerconnect' and 'peerclose' events of underlying client.
  */
  onPeerListUpdated: (peers: PeerList) => void | null

  /**
   * Fires when 'index' message received from another peer.
  */
  onMediaIndexUpdated: (index: number) => void | null

  /**
   * Fires when 'player' message received from another peer.
  */
  onPlayerStateUpdated: (state: EventData<PlayerStateEvent>) => void | null

  /**
   * Should be called when client picking torrent
   */
  localMagnetLink (magnet: EventData<MagnetLinkEvent>) {
    this.#magnet = magnet
    // Prevent uninitialized session from becoming host
    if (this.initializated) {
      this.#isHost = true
    }

    this.#client?.onMagnetLink(magnet)
  }

  /**
   * Should be called when media index changed locally
   */
  localMediaIndexChanged (index: number) {
    this.#index = index

    this.#client?.onMediaIndexChanged(index)
  }

  /**
   * Should be called when player state changed locally
   */
  localPlayerStateChanged (state: EventData<PlayerStateEvent>) {
    this.#player.paused = state.paused
    this.#player.time = state.time

    this.#client?.onPlayerStateChanged(this.#player)
  }

  // #endregion
}
