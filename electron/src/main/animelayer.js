import { AnimeLayer, Credentials } from 'animelayerjs'
import { ipcMain } from 'electron'
import { execSync } from 'node:child_process'

let credentials
let animelayer

try {
  credentials = JSON.parse(execSync('keepassxc-browser-cli get http://animelayer.ru/').toString('ascii').slice(0, -1))
  animelayer = new AnimeLayer(new Credentials(credentials.login, credentials.password))
} catch {}


function timeouted (time) {
  return new Promise((resolve, reject) => setTimeout(reject, time))
}

function normalizeTitle (name) {
  return name.replace(/[-,]/, ' ').split(' ').filter(e => e.length < 10).slice(0, 3).join(' ')
}

async function searchWithTimeout (title, quality, episode, timeout) {
  console.log(normalizeTitle(title), { quality, episode })

  const promise = animelayer.searchWithMagnet(normalizeTitle(title), { quality, episode })
  await Promise.race([
    promise,
    timeouted(timeout)
  ])

  return promise
}

async function adaptiveSearch (title, quality) {
  const list = await searchWithTimeout(title, quality, 1, 5000)
  if (list.length) {
    return list
  }
  return searchWithTimeout(title, quality, 0, 5000)
}

export function registerAnimeLayerApi () {
  ipcMain.handle('al:search', async (_, { title, episode, quality }) => {
    if (!animelayer) return

    const promise = adaptiveSearch(title, quality)
    try {
      await promise
    } catch (e) {
      console.error(e)
      throw e
    }

    const list = await promise

    const mapped = []
    for (const entry of list) {
      mapped.push({
        id: entry.hash,
        title: `[${entry.uploader}] ${entry.title}`,
        link: entry.magnetUri,
        seeders: entry.seed,
        leechers: entry.leech,
        downloads: entry.seed + entry.leech,
        hash: entry.hash,
        size: entry.size,
        verified: false,
        batch: true,
        date: entry.date
      })
    }

    return mapped
  })
}
