import TorrentClient from 'common/modules/webtorrent.js'
import { ipcRendererWebTorrent } from './ipc.js'

globalThis.chrome.runtime = { lastError: false, id: 'something' }

const controller = (async () => {
  const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' })

  const worker = reg.active || reg.waiting || reg.installing
  return new Promise(resolve => {
    function checkState (worker) {
      return worker.state === 'activated' && resolve(reg)
    }
    if (!checkState(worker)) {
      worker.addEventListener('statechange', ({ target }) => checkState(target))
    }
  })
})()
window.controller = controller

window.client = new TorrentClient(ipcRendererWebTorrent, () => ({ bsize: Infinity, bavail: Infinity }), 'browser', controller)
