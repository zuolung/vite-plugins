import type { Plugin } from 'vite'
import fs from 'fs'
import { join } from 'path'

const CWD = process.cwd()

export default function VitePluginStyleImport({
  name,
  includes = ['tsx', 'jsx'],
  createImport,
}: {
  name: string
  includes?: string[]
  createImport?: (component: string) => string | undefined
}): Plugin {
  return {
    name: `vite:style-import${name}`,
    enforce: 'post',
    load: async function (id) {
      const extension = id.split('.')[1] as string
      if (includes.includes(extension)) {
        const codeString = await fs.readFileSync(id, 'utf-8')
        const usedCompnents = getImports(codeString, name)
        if (usedCompnents.length) {
          const importStyles = usedCompnents
            .map((item) => {
              const compName = formatcompName(item)
              if (createImport) return createImport(compName)
              const stylePath = `node_modules/${name}/es/${compName}/style/index.less`
              if (fs.existsSync(join(CWD, stylePath))) {
                return `import "${name}/es/${compName}/style/index.less"`
              }
              return ''
            })
            .join('\n')

          return `${importStyles}\n ${codeString}`
        }
        return codeString
      }

      return null
    },
  }
}

function formatcompName(str: string) {
  return str.substring(0, 1).toLocaleLowerCase() + str.substring(1)
}

// https://regexr.com/47jlq
const IMPORT_REG =
  /import\s+?(?:(?:(?:[\w*\s{},]*)\s+from(\s+)?)|)(?:(?:".*?")|(?:'.*?'))[\s]*?(?:;|$|)/g

function getImports(code: string, name: string): string[] {
  const imports = code.match(IMPORT_REG) || []
  let result: string[] = []
  imports
    .filter((line) => !line.includes('import type') && line.includes(name))
    .map((it) => {
      if (it.includes('{') && it.includes('}')) {
        const mats = it.match(/\{[\w\W]*\}/)
        if (mats) {
          const mat = mats[0].replace(/\{|\}|\s/g, '').split(',')
          result = result.concat(mat)
        }
      }
    })

  return result
}
