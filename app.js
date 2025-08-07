// app.js

const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

// 使用 body-parser 来解析 POST 请求体
const bodyParser = require("body-parser");
app.use(bodyParser.json());

// 引入路由模块
const testRouter = require("./routes/test");

// 使用路由模块
app.use("/v1/test", testRouter);

// 从环境变量中读取 Token
const token = process.env.TOKEN || "default_token";
app.set("token", token);

app.listen(port, () => {
  console.log(`Server is running at http://0.0.0.0:${port}`);
});
