# 实现一个最简单的Webpack
## 理解Webpack的原理
1. 将一切内容视为模块
2. 遍历模块，执行ES编译，生成依赖图
3. 创建执行依赖图的运行时

由于我们实现的是最简单的webpack，只支持打包js

## 将原理抽象为步骤
1. 对读取到的每一个文件，生成一个webpack需要用到的表示。我们称为asset
    
    ```ts
    {
        id,         // 每一个模块需要一个id
        filename,       // 模块的文件名
        dependencies,   // 模块的依赖文件名集合，比如['./a.js']
        code            // 模块被babel解析后的代码
    }
    ```
2. 通过读取入口文件产生的asset，去遍历其依赖，进行广度优先遍历。并依次生成asset，并将生成的assets推入队列。直到遍历结束。
3. 生成运行时代码，将队列作为参数传入，生成目标文件。

## 代码讲解
### 代码的编译和遍历都交给babel来做
```ts
// 源码ast解析 （parse）
const babylon = require('@babel/parser');
// 遍历器 （traverse）
const traverse = require('@babel/traverse').default;
// ast代码生成和转化（transform）
const babel = require('@babel/core');
```
### 创建全局模块id自增
```ts
let ID = 0;
```
### createAssets
```ts
function createAsset(filename) {
    // 读取文件内容
    const content = fs.readFileSync(filename, 'utf-8');
    // 将文本内容解析为ast
    const ast = babylon.parse(content, {
        sourceType: "module"
    });
    // 用来存储当前文件依赖的模块
    const dependencies = [];

    // 遍历ast，收集依赖
    traverse(ast, {
        // visitor, 在之前抄来的mini-compile中，其中的transform方法就是这么做的
        // 不过这里很简单，只是做了收集依赖的工作
        // 和mini-compile不同的是，也没有enter和exit的钩子
        ImportDeclaration: ({node}) => {
            dependencies.push(node.source.value);
        }
    });

    // 获取当前模块id，并且全局id自增
    const id = ID++;

    // 异步的将es6代码按照preset-env转化成es5
    const {code} = babel.transformFromAstSync(ast, null, {
        presets: ['@babel/preset-env']
    });

    // 返回值包括模块id，文件名，文件依赖，编译后的代码
    return {
        id,
        filename,
        dependencies,
        code
    };
}
```
### createGraph
```ts
/**
 * 从入口开始分析所有依赖项，形成依赖图，采用广度遍历
 * 广度优先没有递归
 * @param entry
 */
function createGraph(entry) {
    // 从入口开始产生首个Graph中的Asset节点
    const mainAsset = createAsset(entry);
    console.log(mainAsset)

    // 广度优先BFS需要一个额外的队列来表示当前处理的是哪一个节点
    const queue = [mainAsset];

    // 对队列中的每一个节点
    for (const asset of queue) {
        // 获取asset的文件名
        const dirname = path.dirname(asset.filename);
        // 创建一个字段用来存放依赖文件名 - createAsset返回的模块实体id的对应表
        asset.mapping = {};

        // 从入口资源开始的dirname推算实际的绝对路径
        asset.dependencies.forEach(relativePath => {
            const absolutePath = path.join(dirname, relativePath);

            // 获得子依赖（子模块）的依赖项、代码、模块id，文件名
            const child = createAsset(absolutePath);

            // 将子依赖加入当前asset的mapping中
            asset.mapping[relativePath] = child.id;

            //将子依赖也加入队列中，广度遍历
            queue.push(child);
        });
    }
    // 最后返回的会是被处理过的模块的队列（表示都遍历处理完了）
    return queue;
}

```
### 目标代码生成
```ts
/**
 * 根据生成的依赖关系图，生成浏览器可执行文件
 * @param graph
 */
function bundle(graph) {
    let modules = '';

    // 生成依赖字符串，这里的东西会被作为参数传给最后生成的代码作为params
    graph.forEach(mod => {
        modules += `${mod.id}:[
            // 生成的代码需要用到require方法，exports是module.exports, 这里就跟cjs的模块化定义一样
            // module 是代表当前模块的一个对象
            // 因为生成的代码里面是把import，export转化成了cjs的require, module.exports 的，所以我们要模拟cjs把这些方法传进来。
            function (require, module, exports) {
                ${mod.code}
            },
            ${JSON.stringify(mod.mapping)},
        ],`
    });

    //require, module, exports 是 cjs的标准不能再浏览器中直接使用，所以这里模拟cjs模块加载，执行，导出操作。
    return `
    (function(modules){
      //创建require函数， 它接受一个模块ID（这个模块id是数字0，1，2） ，它会在我们上面定义 modules 中找到对应是模块.
      function require(id){
      // fn 是文件模块的代码，mapping是其依赖对应的模块id表
        const [fn, mapping] = modules[id];
        // 因为实际上模块都在一个文件中了，所谓的require实际上是根据传入的路径
        // 获取id，然后调用这个require方法去modules列表里找相关的模块，然后递归的执行，将返回值送给该外层模块使用
        // 由于模块需要require方法，我们在这里自己实现一个运行时的，交给他用
        function localRequire(relativePath){
          //根据模块的路径在mapping中找到对应的模块id
          return require(mapping[relativePath]);
        }
        // cjs 也需要exports 和 module 对象，这里也要送进去
        const module = {exports:{}};
        //执行每个模块的代码。并且把结果注入exports
        // fn内就像是一个cjs模块，天生拥有require方法，表示模块的module对象和 module.exports对象

        fn(localRequire, module, module.exports);
        // 执行完模块代码后，返回要导出的值
        return module.exports;
      }
      //执行入口文件，
      require(0);
    })({${modules}})
  `;
}
```

### 执行
```ts
const graph = createGraph("../src/entry.js");
const ret = bundle(graph);

// 打包生成文件
fs.writeFileSync("./bundle.js", ret);
```
