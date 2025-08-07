// routes/extract.js

const express = require("express");
const router = express.Router();

const fetchUrl = require("../src/fetchUrl.js");
const parsingResponse = require("../src/parsingResponse.js");

/** 提取出指定 URL 内的图片、实况图片或视频的 URLs */
router.get("/extract", async (req, res) => {
    const { url, downloader, token } = req.query;
    if (token !== req.app.get("token")) {
        return res.status(401).json({ message: "无法提取资源的 URLs: 认证失败" });
    }
    if (!url || !downloader) {
        return res.status(400).json({ message: "无法提取资源的 URLs: 缺少必要参数" });
    }

    try {
        // 发起网络请求
        const response = await fetchUrl(url, downloader);

        // 解析网络请求的响应
        const mediaUrls = parsingResponse(response, downloader);
        if (mediaUrls.length === 0) {
            console.error(`请求 ${url} 的响应: ${response}`);
            throw new Error("响应中不包含任何有效资源的 URL");
        }

        console.log(`mediaUrls: ${mediaUrls.toString()}`);
        res.json({ mediaUrls });
    } catch (error) {
        console.error(`提取资源的 URLs 失败: ${error.message}`);
        res.status(500).json({ message: `提取资源的 URLs 失败: ${error.message}` });
    }
});
