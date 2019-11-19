module.exports = {
  env: {
    es6: true, // 支持新的 ES6 全局变量，同时自动启用 ES6 语法支持
    node: true // 启动node环境
  },
  extends: 'eslint:recommended',
  globals: {
    Atomics: "readonly",
    SharedArrayBuffer: "readonly"
  },
  parserOptions: {
    ecmaVersion: 2018
  },
  rules: {
    // allow paren-less arrow functions
    'arrow-parens': 0,
    // allow async-await
    'generator-star-spacing': 0,
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0
  }
};