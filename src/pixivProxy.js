// src/pixivProxy.js

const axios = require("axios");
const mime = require("mime-types");
const { createS3Client, objectExists, putObject } = require("./s3Client");
const { getApp } = require("../utils/common");

/**
 * 从 URL 中提取原始文件名, 例如 117818655_p0.png
 * 并做一层白名单清洗, 避免奇怪字符
 */
const extractPixivFilename = url => {
  const u = new URL(url);
  // pathname 形如: /img-original/img/2024/04/14/03/45/17/117818655_p0.png
  const raw = u.pathname.split("/").pop() || "";
  // 仅保留常见安全字符
  const safe = raw.replace(/[^a-zA-Z0-9._-]/g, "");
  return safe;
};

/**
 * 生成对象 key: cache/pixiv/<作品 ID>/<原始文件名>
 * 示例: cache/pixiv/105055450/105055450_p0.jpg
 */
const makeKeyFromUrl = url => {
  const filename = extractPixivFilename(url);
  // 兜底: 如果解析不到文件名, 就直接退回一个时间戳文件名, 默认 .jpg 后缀, 一般来说不会发生这种情况
  const finalName = filename || `unknown_${Date.now()}.jpg`;

  // 试图从文件名中提取作品 ID, 例如 105055450_p0.jpg -> 105055450
  const match = finalName.match(/^(\d+)_p\d+\./);
  const illustId = match ? match[1] : "unknown";

  // 拼接路径: cache/pixiv/<illustId>/<finalName>
  return `cache/pixiv/${illustId}/${finalName}`;
};

/**
 * 计算公开访问的 URL
 * 优先使用 S3_PUBLIC_BASE, 例如自定义的 CDN 域名, 否则回退为 endpoint + /bucket/key
 */
const buildPublicUrl = ({ publicBase, endpoint, bucket, key }) => {
    if (publicBase) {
        // e.g. https://cdn.example.com/{key}
        return `${publicBase.replace(/\/+$/, "")}/${key}`;
    }
    // path-style: {endpoint}/{bucket}/{key}, e.g. https://<accountid>.r2.cloudflarestorage.com/{bucket}/{key}
    return `${endpoint.replace(/\/+$/, "")}/${bucket}/${key}`;
}

/**
 * 下载 Pixiv 原图
 */
const downloadPixivOriginal = async (url, pixivCookie) => {
    const response = await axios.get(url, {
        responseType: "arraybuffer",
        headers: {
            Referer: "https://www.pixiv.net/",
            Cookie: pixivCookie || ""
        },
        timeout: 30000,
        maxRedirects: 3,
        validateStatus: s => s >= 200 && s < 400
    });
    // content-type 尽量从 header 拿, 不行就根据后缀猜
    let contentType = response.headers["content-type"];
    if (!contentType) {
        const guessed = mime.lookup(url);
        if (guessed) contentType = guessed;
    }
    return { buffer: Buffer.from(response.data), contentType: contentType || "image/jpeg" };
}

/**
 * 把单个 Pixiv 原图 URL 缓存到 S3, 并返回 S3 URL
 */
const cachePixivImageToS3 = async url => {
    const app = getApp();
    const pixivCookie = app.get("pixivCookie");

    const s3Endpoint = app.get("s3Endpoint");
    const s3Bucket = app.get("s3Bucket");
    const s3AccessKeyId = app.get("s3AccessKeyId");
    const s3SecretAccessKey = app.get("s3SecretAccessKey");
    const s3PublicBase = app.get("s3PublicBase");

    const s3 = createS3Client({
        endpoint: s3Endpoint,
        accessKeyId: s3AccessKeyId,
        secretAccessKey: s3SecretAccessKey
    });

    const key = makeKeyFromUrl(url);

    const exists = await objectExists(s3, s3Bucket, key);
    if (!exists) {
        const { buffer, contentType } = await downloadPixivOriginal(url, pixivCookie);
        await putObject(s3, s3Bucket, key, buffer, contentType);
    }

    return buildPublicUrl({ publicBase: s3PublicBase, endpoint: s3Endpoint, bucket: s3Bucket, key });
}

/**
 * 批量处理: 把 Pixiv 原图 URLs 映射为 S3 URLs, 并做去重与并发控制
 */
const batchCachePixivImages = async (urls, concurrency = 5) => {
    const results = [];
    const queue = Array.from(new Set(urls)); // 去重
    let idx = 0;

    const worker = async () => {
        while (idx < queue.length) {
            const i = idx++;
            const u = queue[i];
            try {
                console.log(`[${new Date().toLocaleString()}] 缓存 Pixiv 图片: ${u}`);
                const s3url = await cachePixivImageToS3(u);
                results.push([u, s3url]);
            } catch (error) {
                console.error(`[${new Date().toLocaleString()}] 缓存 Pixiv 图片失败: ${u}`, error.message);
                results.push([u, u]); // 失败则回退为原始 URL, 避免整体报错
            }
        }
    }

    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, () => worker());
    await Promise.all(workers);

    // 返回一个 Map, 方便替换
    return new Map(results);
}

module.exports = { batchCachePixivImages, cachePixivImageToS3 };
