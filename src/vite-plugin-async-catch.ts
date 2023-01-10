import type { Plugin } from 'vite'
import template from '@babel/template'
import { stringLiteral } from '@babel/types'
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import generator from '@babel/generator'

let tryTemplate = `
try {
} catch (e) {
  handleTryCatchError(ERROR_F, ERROR_N, ERROR_S, e)
}`

export default function VitePluginAsyncCatch({
  includes = ['.tsx', '.ts', '.js', '.jsx'],
  ignores = [],
}: {
  includes?: Array<string>
  ignores?: Array<string>
}): Plugin {
  return {
    name: `vite:async-catch`,
    transform: function (code, id) {
      const idArr = id.split('.')
      const fileSuffix = `.${idArr[idArr.length - 1]}`
      const fileName = idArr
        .filter((_, index) => index < idArr.length - 1)
        .join('.')
      if (!includes.includes(fileSuffix))
        return {
          code,
          map: null,
        }
      if (ignores.includes(fileName))
        return {
          code,
          map: null,
        }
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
      })

      const visitor = {
        AwaitExpression(path) {
          if (path.findParent((p) => p.isTryStatement())) {
            return false
          }
          const filePath = id || 'unknown'
          let node = path.node
          const asyncPath = path.findParent(
            (p) =>
              p &&
              p.node &&
              p.node.async &&
              (p.isFunctionDeclaration() ||
                p.isArrowFunctionExpression() ||
                p.isFunctionExpression() ||
                p.isObjectMethod() ||
                p.isClassMethod()),
          )
          let asyncName = ''
          const type = asyncPath.node.type
          switch (type) {
            case 'FunctionExpression':
            case 'ClassMethod':
            case 'ArrowFunctionExpression':
              let identifier = asyncPath.getSibling('id')
              asyncName =
                identifier && identifier.node ? identifier.node.name : ''
              break
            case 'FunctionDeclaration':
              asyncName = (asyncPath.node.id && asyncPath.node.id.name) || ''
              break
            case 'ObjectMethod':
              asyncName = asyncPath.node.key.name || ''
              break
          }
          let funcName =
            asyncName ||
            (node.argument.callee && node.argument.callee.name) ||
            ''
          const temp = template.default(tryTemplate)
          const tempArgumentObj = {
            ERROR_F: stringLiteral(filePath),
            ERROR_N: stringLiteral(funcName),
            ERROR_S: stringLiteral(`${asyncPath.node.start || ''}`),
          }
          const tryNode = temp(tempArgumentObj)
          let info = asyncPath.node.body
          tryNode.block.body.push(...info.body)
          info.body = [tryNode]
          return false
        },
      }

      traverse.default(ast, visitor)

      return {
        code: generator.default(ast).code,
        map: null,
      }
    },
  }
}
