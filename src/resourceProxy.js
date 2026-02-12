// src/resourceProxy.js

const axios = require('axios');
const crypto = require('crypto');
const mime = require('mime-types');
const { createS3Client, objectExists, putObject } = require('./s3Client');
const { getApp } = require('../utils/common');

class ResourceProxy {
    constructor() {
        this.app = getApp();
        this.s3Config = {
            endpointInternal: this.app.get('s3EndpointInternal'),
            endpointPublic: this.app.get('s3EndpointPublic'),
            bucket: this.app.get('s3Bucket'),
            accessKeyId: this.app.get('s3AccessKeyId'),
            secretAccessKey: this.app.get('s3SecretAccessKey'),
            publicBase: this.app.get('s3PublicBase')
        };
    }

    /**
     * 根据 URL 生成缓存 Key
     * 格式: cache/<prefix>/[sourceId/]<filename>.<ext>
     */
    generateKey(url, prefix, sourceId = null) {
        // 尝试从 URL 中提取文件后缀 (默认为 jpg)
        let ext = 'jpg';
        const extMatch = url.match(/\.([a-zA-Z0-9]+)(\?|$)/);
        if (extMatch) {
            ext = extMatch[1];
        }

        // 生成文件名
        let filename;
        if (sourceId) {
            // 如果有 sourceId, 使用 URL 的最后一部分作为文件名, 但要去掉后缀和查询参数
            const lastPart = url.split('/').pop().split('?')[0];
            // 去掉后缀 (如果存在)
            filename = lastPart.includes('.') ? lastPart.substring(0, lastPart.lastIndexOf('.')) : lastPart;
        } else {
            // 如果没有 sourceId, 则对 URL 进行 MD5 哈希
            filename = crypto.createHash('md5').update(url).digest('hex');
        }

        // 拼接最终路径: cache/<prefix>/[sourceId/]<filename>.<ext>
        const finalName = sourceId ? `${sourceId}/${filename}` : filename;
        return `cache/${prefix}/${finalName}.${ext}`;
    }

    /**
     * 计算公开访问的 URL
     */
    buildPublicUrl({ publicBase, endpoint, bucket, key }) {
        if (publicBase) {
            return `${publicBase.replace(/\/+$/, '')}/${key}`;
        }
        return `${endpoint.replace(/\/+$/, '')}/${bucket}/${key}`;
    }

    /**
     * 获取下载资源时的请求头
     * 子类可以重写此方法以提供特定的 headers
     */
    getDownloadHeaders(url, headers) {
        return headers || {};
    }

    /**
     * 下载资源
     */
    async downloadResource(url, headers) {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: this.getDownloadHeaders(url, headers),
            timeout: 30000,
            maxRedirects: 3,
            validateStatus: s => s >= 200 && s < 400
        });

        let contentType = response.headers['content-type'];
        if (!contentType) {
            const guessed = mime.lookup(url);
            if (guessed) { contentType = guessed; }
        }
        return { buffer: Buffer.from(response.data), contentType: contentType || 'application/octet-stream' };
    }

    /**
     * 将单个资源缓存到 S3
     */
    async cacheResourceToS3(url, prefix, headers = {}, sourceId = null) {
        const { endpointInternal, endpointPublic, bucket, accessKeyId, secretAccessKey, publicBase } = this.s3Config;

        // 如果未配置 S3, 直接返回原 URL
        if (!endpointInternal || !bucket) {
            return url;
        }

        const s3 = createS3Client({
            endpoint: endpointInternal,
            accessKeyId: accessKeyId,
            secretAccessKey: secretAccessKey
        });

        const key = this.generateKey(url, prefix, sourceId);

        try {
            const exists = await objectExists(s3, bucket, key);
            if (!exists) {
                const { buffer, contentType } = await this.downloadResource(url, headers);
                // console.log(`[${new Date().toLocaleString()}] 上传资源到 S3: ${key}, size: ${buffer.length}`);
                await putObject(s3, bucket, key, buffer, contentType);
            }
        } catch (err) {
            // 如果出错, 抛出异常让上层捕获
            throw new Error(`S3 操作失败: ${err.message}`, { cause: err });
        }

        return this.buildPublicUrl({ publicBase, endpoint: endpointPublic, bucket, key });
    }

    /**
     * 批量缓存资源
     * @param {string[]} urls - 资源 URL 列表
     * @param {string} prefix - S3 存储路径前缀 (如 "miyoushe", "weibo")
     * @param {Object} headers - 请求头 (如 Referer)
     * @param {number} concurrency - 并发数
     * @param {string|number} sourceId - 资源归属的 ID, 如文章 ID、帖子 ID、笔记 ID、博客 ID、作品 ID 等
     * @returns {Promise<Map<string, string>>} Original URL -> S3 URL 映射
     */
    async batchCacheResources(urls, prefix, headers = {}, concurrency = 5, sourceId = null) {
        const results = [];
        // 数组去重
        const queue = Array.from(new Set(urls));
        let idx = 0;

        const worker = async () => {
            while (idx < queue.length) {
                const i = idx++; // 原子操作 (js单线程)
                if (i >= queue.length) { break; }

                const u = queue[i];
                try {
                    // console.log(`[${new Date().toLocaleString()}] 缓存资源 (${prefix}): ${u}`);
                    const s3url = await this.cacheResourceToS3(u, prefix, headers, sourceId);
                    results.push([u, s3url]); // 成功返回映射
                } catch (error) {
                    console.error(`[${new Date().toLocaleString()}] 缓存资源失败 (${prefix}): ${u}`, error.message);
                    results.push([u, u]); // 失败回退为原 URL
                }
            }
        };

        // 启动 worker
        const workers = Array.from({ length: Math.min(concurrency, queue.length) }, () => worker());
        await Promise.all(workers);

        return new Map(results);
    }
}

module.exports = ResourceProxy;
