import { AnimeLayer, Credentials } from 'animelayerjs'
import { ipcMain } from 'electron'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const credentials = JSON.parse(readFileSync(join(process.env.HOME, '.animelayer.json')).toString('ascii'))

const animelayer = new AnimeLayer(new Credentials(credentials.login, credentials.password))

function timeouted (time) {
  return new Promise((resolve, reject) => setTimeout(reject, time))
}

function normalizeTitle (name) {
  return name.split(' ').filter(e => e.length < 12).join(' ').replace('-', ' ')
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
