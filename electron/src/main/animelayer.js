import { AnimeLayer, Credentials } from 'animelayerjs'
import { ipcMain } from 'electron'
import { sleep } from 'common/modules/util'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const credentials = JSON.parse(readFileSync(join(process.env.HOME, '.animelayer.json')).toString('ascii'))

const animelayer = new AnimeLayer(new Credentials(credentials.login, credentials.password))

function normalizeTitle (name) {
  return name.replace('-', ' ')
}

export function registerAnimeLayerApi () {
  ipcMain.handle('al:search', async (_, { title, episode, quality }) => {
    console.log(`Searching ${title} ${quality}`)
    const promise = animelayer.searchWithMagnet(normalizeTitle(title), { quality, episode })
    try {
      await Promise.race([
        promise,
        sleep(5000)
      ])
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
        verified: true,
        batch: true,
        date: entry.date
      })
    }

    return mapped
  })
}
