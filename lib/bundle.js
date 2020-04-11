
    (function(modules){
      //创建require函数， 它接受一个模块ID（这个模块id是数字0，1，2） ，它会在我们上面定义 modules 中找到对应是模块.
      function require(id){
      // fn 是文件模块的代码，mapping是其依赖对应的模块id表
        const [fn, mapping] = modules[id];
        // 因为实际上模块都在一个文件中了，所谓的require实际上是根据传入的路径
        // 获取id，然后调用这个require方法去modules列表里找相关的模块，然后递归的执行，将返回值送给该外层模块使用
        function localRequire(relativePath){
          //根据模块的路径在mapping中找到对应的模块id
          return require(mapping[relativePath]);
        }
        const module = {exports:{}};
        //执行每个模块的代码。并且把结果注入exports
        // fn内就像是一个cjs模块，天生拥有require方法，表示模块的module对象和 module.exports对象
        fn(localRequire, module, module.exports);
        // 执行完模块代码后，返回要导出的值
        return module.exports;
      }
      //执行入口文件，
      require(0);
    })({0:[
            // 生成的代码需要用到require方法，exports是module.exports, 这里就跟cjs的模块化定义一样
            // module 是代表当前模块的一个对象
            function (require, module, exports) {
                "use strict";

var _message = _interopRequireDefault(require("./message.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

console.log(_message["default"]);
            },
            {"./message.js":1},
        ],1:[
            // 生成的代码需要用到require方法，exports是module.exports, 这里就跟cjs的模块化定义一样
            // module 是代表当前模块的一个对象
            function (require, module, exports) {
                "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _name = require("./name.js");

var _default = "hello ".concat(_name.name);

exports["default"] = _default;
            },
            {"./name.js":2},
        ],2:[
            // 生成的代码需要用到require方法，exports是module.exports, 这里就跟cjs的模块化定义一样
            // module 是代表当前模块的一个对象
            function (require, module, exports) {
                "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.name = void 0;
var name = 'world';
exports.name = name;
            },
            {},
        ],})
  