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

// 从环境变量中读取 S3 配置
const s3Endpoint = process.env.S3_ENDPOINT || "";
const s3Bucket = process.env.S3_BUCKET || "";
const s3AccessKeyId = process.env.S3_ACCESS_KEY_ID || "";
const s3SecretAccessKey = process.env.S3_SECRET_ACCESS_KEY || "";
const s3PublicBase = process.env.S3_PUBLIC_BASE || ""; // 可选: CDN 或自定义域名

app.set("s3Endpoint", s3Endpoint);
app.set("s3Bucket", s3Bucket);
app.set("s3AccessKeyId", s3AccessKeyId);
app.set("s3SecretAccessKey", s3SecretAccessKey);
app.set("s3PublicBase", s3PublicBase);

// 从环境变量中读取其他配置
/**
 * 由于客户端暂时没有实现通过 Pixiv Cookie 下载图片的细节, 因此默认让服务端代理 Pixiv 图片的下载,
 * 如果禁用此功能, 缺少 Cookie 的客户端将无法下载 Pixiv 图片
 */
const pixivProxyEnabled = process.env.PIXIV_PROXY_ENABLED === "false" ? false : true;
app.set("pixivProxyEnabled", pixivProxyEnabled);

// 注册 App 实例
const { setApp } = require("./utils/common");
setApp(app);

app.listen(port, () => {
    console.log(`Server is running at http://0.0.0.0:${port}`);
});
