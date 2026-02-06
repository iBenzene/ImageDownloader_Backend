// routes/api/extract.js

const express = require("express");
const router = express.Router();

const fetchUrl = require("../../src/fetchUrl");
const parsingResponse = require("../../src/parsingResponse");

/** 提取出指定 URL 内的图片、实况图片或视频的 URLs */
router.get("/", async (req, res) => {
    const { url, downloader, token } = req.query;
    if (token !== req.app.get("token")) {
        return res.status(401).json({ error: "无法提取资源的 URLs: 认证失败" });
    }
    if (!url || !downloader) {
        return res.status(400).json({ error: "无法提取资源的 URLs: 缺少必要参数" });
    }

    try {
        // 发起网络请求
        const response = await fetchUrl(url, downloader);

        // 解析网络请求的响应
        const mediaUrls = await parsingResponse(response, downloader);
        if (mediaUrls.length === 0) {
            console.error(`[${new Date().toLocaleString()}] 请求 ${url} 的响应: ${JSON.stringify(response.data, null, 2)}`);
            throw new Error("响应中不包含任何有效资源的 URL");
        }

        console.log(`[${new Date().toLocaleString()}] mediaUrls: ${mediaUrls}`);
        res.json({ mediaUrls });
    } catch (error) {
        console.error(`[${new Date().toLocaleString()}] 提取资源的 URLs 失败: ${error.message}`);
        try {
            res.status(500).json({ error: `提取资源的 URLs 失败: ${error.message}` });
        } catch (error) {
            console.error(`[${new Date().toLocaleString()}] 响应客户端失败: ${error.message}`);
        }
    }
});

module.exports = router;
