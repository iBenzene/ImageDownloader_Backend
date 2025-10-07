// app.js

// 加载环境变量
if (process.env.NODE_ENV !== 'production') {
    try {
        require('dotenv').config({ path: '.env.local' });
    } catch (error) {
        console.warn(`Failed to load .env.local: ${error.message}`);
    }
}

const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

// 使用 body-parser 来解析 POST 请求体
const bodyParser = require("body-parser");
app.use(bodyParser.json());

// 引入路由模块
const testRouter = require("./routes/test");
const extractRouter = require("./routes/extract");

// 使用路由模块
app.use("/v1/test", testRouter);
app.use("/v1/extract", extractRouter);

// 从环境变量中读取 Token
const token = process.env.TOKEN || "default_token";
app.set("token", token);

// 从环境变量中读取 Cookies
const pixivCookie = process.env.PIXIV_COOKIE || "";
app.set("pixivCookie", pixivCookie);

// 注册 App 实例
const { setApp } = require("./utils/common");
setApp(app);

app.listen(port, () => {
    console.log(`Server is running at http://0.0.0.0:${port}`);
});
