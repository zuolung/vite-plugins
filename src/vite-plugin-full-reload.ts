import { relative, resolve } from 'path'
import colors from 'picocolors'
import picomatch from 'picomatch'
import { type PluginOption, type ViteDevServer, normalizePath } from 'vite'

/**
 * Configuration for the watched paths.
 */
export interface Config {
  /**
   * How many milliseconds to wait before reloading the page after a file change.
   * @default 0
   */
  delay?: number

  /**
   * Whether to log when a file change triggers a full reload.
   * @default true
   */
  log?: boolean

  /**
   * Files will be resolved against this path.
   * @default process.cwd()
   */
  root?: string
}

export function normalizePaths(
  root: string,
  path: string | string[],
): string[] {
  return (Array.isArray(path) ? path : [path])
    .map((path) => resolve(root, path))
    .map(normalizePath)
}

export default function VitePluginFullReload(
  paths: string | string[],
  config: Config = {},
): PluginOption {
  return {
    name: 'vite: plugin-full-reload',

    apply: 'serve',

    config: () => ({ server: { watch: { disableGlobbing: false } } }),

    configureServer({ watcher, ws, config: { logger } }: ViteDevServer) {
      const { root = process.cwd(), log = true, delay = 0 } = config

      const files = normalizePaths(root, paths)
      const shouldReload = picomatch(files)
      const checkReload = (path: string) => {
        if (shouldReload(path)) {
          setTimeout(() => ws.send({ type: 'full-reload', path: path }), delay)
          if (log)
            logger.info(
              `${colors.green('page reload')} ${colors.dim(
                relative(root, path),
              )}`,
              { clear: true, timestamp: true },
            )
        }
      }

      watcher.add(files)
      watcher.on('add', checkReload)
      watcher.on('change', checkReload)
    },
  }
}
