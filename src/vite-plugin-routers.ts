import type { Plugin } from 'vite'
import { format } from 'prettier'
import glob from 'glob'
import fs from 'fs'
import { watch } from 'chokidar'
import { join } from 'path'

const DEFAULT_PAGES = join(process.cwd(), './src/pages')
const DEAULT_IGNORE = ['com', 'components', 'utils']
let ROUTER_PATH = join(process.cwd(), './src/router/config.ts')
const SRC = join(process.cwd(), './src')
const CWD = process.cwd()
const routersMap: string[] = []
const routers: any[] = []
let isWatched = false

export default function VitePluginRouters({
  watch,
  pages,
  ignore,
  routerPath,
}: {
  watch?: boolean
  pages?: string
  ignore?: string[]
  routerPath?: string
}): Plugin {
  const pages_ = pages || DEFAULT_PAGES
  const ignore_ = ignore || DEAULT_IGNORE
  if (routerPath) ROUTER_PATH = routerPath
  const globPath = [`${pages_}/**/*.tsx`, `${pages_}/*.tsx`]
  const watchPath = globPath.concat([`${pages_}/*`, `${pages_}/*/**`])

  return {
    name: 'vite-plugin-routers',
    buildStart: async function () {
      return new Promise((resolve) => {
        globMax(globPath, (paths: string[]) => {
          for (let i = 0; i < paths.length; i++) {
            const pat = paths[i] as string
            const route = pat.replace(SRC, '')
            if (route && isRouter(route, ignore_)) {
              createRouter(route.replace('.tsx', ''))
            }
          }
          writeRoutes()
          if (watch && !isWatched) {
            watchRouters(watchPath, ignore_)
            isWatched = true
          }
          resolve()
        })
      })
    },
  }
}

function watchRouters(p: string[], ignore: string[]) {
  let readyOk = false
  const watcher = watch(p, {
    persistent: true,
  })

  watcher.on('ready', function () {
    readyOk = true
  })

  watcher.on('change', function (path) {
    if (readyOk) {
      const route = path.replace(SRC, '')
      if (path && isRouter(route, ignore)) {
        writeRoutes()
      }
    }
  })

  watcher.on('add', function (path) {
    if (readyOk) {
      const route = path.replace(SRC, '')
      if (path && isRouter(route, ignore)) {
        createRouter(route.replace('.tsx', ''))
        writeRoutes()
      }
    }
  })

  watcher.on('unlink', function (path) {
    if (readyOk) {
      const route = path.replace(SRC, '')
      if (path && isRouter(route, ignore)) {
        removeRouters(route.replace('.tsx', ''))
        writeRoutes()
      }
    }
  })

  watcher.on('unlinkDir', function (path) {
    if (readyOk) {
      const route = path.replace(SRC, '')
      if (path && isRouter(route, ignore)) {
        removeRouters(route.replace('.tsx', ''))
        writeRoutes()
      }
    }
  })
}

function createRouter(route: string) {
  if (!routersMap.includes(route)) {
    routersMap.push(route)
    routers.push({
      path: route,
      component: `@${route}`,
      resCode: route.replace(/^\/pages\//, '').replace(/\//g, '_'),
    })
  }
}

function removeRouters(route: string) {
  if (routersMap.includes(route)) {
    let routersIndexs: number[] = []
    for (let i = 0; i < routers.length; i++) {
      if (routers[i].path.includes(route)) {
        routersIndexs.push(i)
      }
    }

    for (let i = 0; i < routersIndexs.length; i++) {
      routers.splice(routersIndexs[i] as any, 1)
      routersMap.splice(routersIndexs[i] as any, 1)
    }
  }
}

async function writeRoutes() {
  let routesCode = 'export default ['

  for (let i = 0; i < routers.length; i++) {
    const rou = routers[i]
    const codesStr = fs.readFileSync(
      rou.component.replace('@', `${CWD}/src`) + '.tsx',
      'utf-8',
    )
    const title = getTitleFromComments(codesStr) || '--'
    if (rou) {
      routesCode += `{
        path: "${rou.path.replace(/^\/pages/, '')}",
        component: () => import("${rou.component}"),
        resCode: "${rou.resCode}",
        title: "${title}"
      },`
    }
  }

  routesCode += ']'

  await fs.writeFileSync(ROUTER_PATH, formatCode(routesCode))
}

function isRouter(p: string, ignore_: string[]) {
  const items = p.split('/')
  let flag = true
  for (let i = 0; i < items.length; i++) {
    if (ignore_.includes(items[i] as any)) {
      flag = false
      return flag
    }
  }
  return flag
}

async function globMax(files, callback) {
  let allPaths: string[] = []
  for (let i = 0; i < files.length; i++) {
    const pats = await globSync(files[i])
    pats?.map((item) => {
      if (!allPaths.includes(item)) {
        allPaths.push(item)
      }
    })
  }
  callback(allPaths)
}

async function globSync(file): Promise<string[]> {
  return new Promise((resolve, reject) => {
    glob(file, (err, pats) => {
      if (err) reject(err)
      resolve(pats)
    })
  })
}

function formatCode(codes: string) {
  let res = codes
  try {
    res = format(codes, {
      singleQuote: true,
      trailingComma: 'all',
      semi: false,
      parser: 'babel',
    })
    return res
  } catch (err) {
    if (err) console.error(`formatCode err: ${err}`)
    return res
  }
}

function getTitleFromComments(codeStr: string) {
  const commentsMatch = codeStr.match(/\/\*\*[\w\W]{4,100}\*\//)
  if (commentsMatch) {
    const commentsStr = commentsMatch[0]
    const comm: Record<string, any> = parseComments(commentsStr)
    return comm['title']
  }
}

function parseComments(comments = '') {
  let res = {}
  if (comments && comments.includes('\n')) {
    const arr = comments
      .split('\n')
      .filter((item) => item.includes('@'))
      .map((item) => item.replace(/^[\s]+/g, ''))
      .map((item) => item.replace('* ', ''))
      .map((item) => item.replace('@', ''))
      .map((item) => item.replace(/[\s]+/, '##'))

    arr.forEach((item) => {
      const cons = item.split('##')
      res[cons[0] as any] = cons[1]
    })
  } else if (comments) {
    const arr = comments
      .replace(/\/\*\*[\s]*/, '')
      .replace(/[\s]*\*\//, '')
      .replace('@', '')
      .split(' ')
    res[arr[0] as any] = arr[1]
  }

  return res
}
