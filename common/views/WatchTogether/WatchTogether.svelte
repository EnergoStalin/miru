<script context='module' lang="ts">
  //@ts-ignore
  import { writable } from 'simple-store-svelte'
  import { client } from '@/modules/torrent.js'
  import { toast } from 'svelte-sonner'
  import { page } from '@/App.svelte'
  import { click } from '@/modules/click.js'
  import { W2GSession } from '@/modules/w2g/session'
  import { BidirectionalFilteredEventBus } from '@/modules/w2g/filter'
  import { type EventData, PlayerStateEvent } from '@/modules/w2g/events';
  import type { Emit, CustomEventTarget } from '@/modules/utils';
  import IPC from '@/modules/ipc.js'
  import 'browser-event-target-emitter'

  type PlayerEmitter = CustomEventTarget<
    & Emit<'PLAYER_UPDATE', EventData<PlayerStateEvent>>
    & Emit<'INDEX_UPDATE', number>
  >

  const sink: PlayerEmitter = new EventTarget()
  const sender: PlayerEmitter = new EventTarget()
  export const event = {
    sender: sender as Omit<PlayerEmitter, 'on' | 'once'>,
    sink: sink as Omit<PlayerEmitter, 'dispatch' | 'emit'>
  }

  const peers = writable({})

  export const sessionCode = writable(false)

  const session = new W2GSession()

  const bus: BidirectionalFilteredEventBus<
    EventData<PlayerStateEvent>,
    EventData<PlayerStateEvent>
  > = new BidirectionalFilteredEventBus(
    (state) => sink.emit('PLAYER_UPDATE', state),
    (detail) => session.localPlayerStateChanged(detail),
    undefined,
    // Dont send time 0 when non host
    () => !session.isHost && !bus.isFirstOutFired,
  )
  
  session.onPeerListUpdated = (p) => peers.update(() => p)
  session.onMediaIndexUpdated = (i) => sink.emit('INDEX_UPDATE', i)
  session.onPlayerStateUpdated = (state) => bus.in(state)


  sender.on('PLAYER_UPDATE', ({ detail }) => bus.out(detail))

  sender.on('INDEX_UPDATE', ({ detail }) => session.localMediaIndexChanged(detail))
  client.on('magnet', ({ detail }) => session.localMagnetLink(detail))

  function cleanup () {
    sessionCode.set(false)
    peers.set({})
    session.dispose()
    bus.reinit()
  }

  function joinLobby (code: string | undefined) {
    cleanup()
    sessionCode.set(session.createClient(code))

    if (!code) invite()
  }

  IPC.on('w2glink', (link: string) => {
    joinLobby(link)
    page.set('watchtogether')
  })

  function invite () {
    if (!session.initializated) return
    navigator.clipboard.writeText(session.inviteLink)
    toast('Copied to clipboard', {
      description: 'Copied invite URL to clipboard',
      duration: 5000
    })
  }
</script>

<script lang="ts">
  import Lobby from './Lobby.svelte'

  let joinText: string

  const inviteRx = /([A-z0-9]{16})/i
  function checkInvite (invite: string) {
    if (!invite) return
    const match = invite?.match(inviteRx)?.[1]
    if (!match) return
    console.log(match)
    page.set('watchtogether')
    joinLobby(match)
    joinText = ''
  }

  $: checkInvite(joinText)
</script>

<div class='d-flex h-full align-items-center flex-column content'>
  <div class='font-size-50 font-weight-bold pt-20 mt-20 root'>Watch Together</div>
  {#if !$sessionCode}
    <div class='d-flex flex-row flex-wrap justify-content-center align-items-center h-full mb-20 pb-20 root'>
      <div class='card d-flex flex-column align-items-center w-300 h-300 justify-content-end'>
        <span class='font-size-80 material-symbols-outlined d-flex align-items-center h-full'>add</span>
        <button class='btn btn-primary btn-lg mt-10 btn-block' type='button' use:click={() => joinLobby(undefined)}>Create Lobby</button>
      </div>
      <div class='card d-flex flex-column align-items-center w-300 h-300 justify-content-end'>
        <span class='font-size-80 material-symbols-outlined d-flex align-items-center h-full'>group_add</span>
        <h2 class='font-weight-bold'>Join Lobby</h2>
        <input
          type='text'
          class='form-control h-50'
          autocomplete='off'
          bind:value={joinText}
          data-option='search'
          placeholder='Lobby code or link' />
      </div>
    </div>
  {:else}
    <Lobby peers={$peers} {cleanup} {invite} />
  {/if}
</div>

<style>
  .font-size-50 {
    font-size: 5rem;
  }
  .font-size-80 {
    font-size: 8rem;
  }
</style>
