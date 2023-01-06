import type { Plugin } from 'vite'
import template from '@babel/template'
import { stringLiteral } from '@babel/types'
import { parse } from '@babel/parser'
import tarverse from '@babel/traverse'
import generator from '@babel/generator'

let tryTemplate = `
try {
} catch (e) {
console.error(ERROR_PLACEHOLDER,e)
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

          // async 函数分为5种情况：函数声明 || 箭头函数 || 函数表达式 || 对象的方法 || class内部函数

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
              // 使用path.getSibling(index)来获得同级的id路径
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

          const temp = template(tryTemplate)

          const tempArgumentObj = {
            ERROR_PLACEHOLDER: stringLiteral(
              `filePath: ${filePath}
              funcName: ${funcName}`,
            ),
          }

          const tryNode = temp(tempArgumentObj)

          // 获取async节点(父节点)的函数体
          let info = asyncPath.node.body
          tryNode.block.body.push(...info.body)
          info.body = [tryNode]

          return false
        },
      }

      tarverse(ast, visitor)

      return {
        code: generator(ast).code,
        map: null,
      }
    },
  }
}
