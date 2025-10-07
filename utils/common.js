// utils/common.js

// 注册 App 示例, 方便在其他模块中获取
let appInstance = null;

const setApp = app => {
  appInstance = app;
}

const getApp = () => {
  return appInstance;
}

module.exports = { setApp, getApp };
