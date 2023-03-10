<p align="center">
  <a href="https://vitejs.dev" target="_blank" rel="noopener noreferrer">
    <img width="180" src="https://vitejs.dev/logo.svg" alt="Vite logo">
  </a>
</p>
<br/>

# Vitejs-plugins

> easy to use vitejs plugins

- 👌 VitePluginAsyncCatch： add `try {} catch (e) {}` exception capture for async function
- ⛺️ VitePluginRouters： dynamically generate page routing files based on directory structure
- 📦 VitePluginStyleImport： styles that reference component libraries on demand
- 📺 VitePluginFullReload： automatically reload the page when some specific files are modified

## Install
```bash
yarn add vitejs-plugins
```

## Usage

### VitePluginAsyncCatch
It is defined globally in advance to handle the error information returned by the multi-layer asyncAwait function

```ts
/**
 * @filePath
 * @functionName
 * @start The number of characters
 * @err reject error info
 **/
window.handleAsyncAwaitError = function (filePath, functionName, start, err) {
  console.info(filePath, functionName, start, err)
}
```
Reconfigure the vitejs plugin

```ts
import { VitePluginAsyncCatch } from 'vitejs-plugins'

export default {
  //.. 
  plugins: [
    VitePluginAsyncCatch({
      includes: ['.tsx', '.ts', '.js', '.jsx'], // default file suffix
      ignores: [], // Some files to be ignore
    })
  ]
}
```

### VitePluginRouters
dynamically generate page routing files based on directory structure
```ts
import { VitePluginRouters } from 'vitejs-plugins'

export default {
  //.. 
  plugins: [
    VitePluginRouters({
      watch: true, // set true when development environment 
      pages: join(process.cwd(), './src/pages'), // Pages Folder
      ignore: ['com', 'components', 'utils'], // Folders ignored
      routerPath: join(process.cwd(), './src/router/config.ts') // routing file path
    })
  ]
}
```
Generated route configuration example, You can manually set the title in the configuration file, which will not be overwritten by subsequent synchronization. Or set it in the form of page note/* * @ title xxx */

```ts
export default [
  {
    path: '/finance/account/detail',
    component: () => import('@/pages/finance/account/detail'),
    resCode: 'finance_account_detail',
    title: '--',
  },
]
```


### VitePluginStyleImport

styles that reference component libraries on demand. For example, reference the style of the ant d component library on demand
```ts
import { VitePluginStyleImport } from 'vitejs-plugins'

export default {
  //.. 
  plugins: [
    VitePluginStyleImport({
      name: 'antd', // component library name
      createImport: createImport, // custom Insert Import Content
    }),
  ]
}

function createImport(component_: string) { // get every component name
  const component = component_.replace(/([A-Z])/g, '-$1').toLowerCase()
  const jsStylePath = `node_modules/antd/es/${component}/style/css.js`
  if (fs.existsSync(join(CWD, jsStylePath))) {
    return `import "antd/es/${component}/style/index.js"`
  } else {
    return ''
  }
}
```

### VitePluginFullReload
automatically reload the page when some specific files are modified.
```ts
import { VitePluginFullReload } from 'vitejs-plugins'

export default {
  //.. 
  plugins: [
    VitePluginFullReload(['config/xxx.config.ts']),
  ]
}
```
the second parameter type is as follows

| Option               | Description                 | Type       | Default                                         |
| ------------------ | -------------------- | ---------- | ---------------------------------------------- |
| delay      | delay time | _number_   | `0` |
| log      | log after reload  | _boolean_   | `true` |
| root      | Files will be resolved against this path | _string_   | `process.cwd()` |
