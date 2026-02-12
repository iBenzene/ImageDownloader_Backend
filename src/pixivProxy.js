// src/pixivProxy.js

const ResourceProxy = require('./resourceProxy');

class PixivProxy extends ResourceProxy {
    constructor() {
        super();
        this.pixivCookie = this.app.get('pixivCookie');
    }

    /**
     * 从 URL 中提取原始文件名, 例如 117818655_p0.png
     * 并做一层白名单清洗, 避免奇怪字符
     */
    extractPixivFilename(url) {
        const u = new URL(url);
        // pathname 形如: /img-original/img/2024/04/14/03/45/17/117818655_p0.png
        const raw = u.pathname.split('/').pop() || '';
        // 仅保留常见安全字符
        const safe = raw.replace(/[^a-zA-Z0-9._-]/g, '');
        return safe;
    }

    /**
     * 生成对象 key: cache/pixiv/<作品 ID>/<原始文件名>
     * 示例: cache/pixiv/105055450/105055450_p0.jpg
     * 重写父类方法
     */
    generateKey(url) {
        const filename = this.extractPixivFilename(url);
        // 兜底: 如果解析不到文件名, 就直接退回一个时间戳文件名, 默认 .jpg 后缀, 一般来说不会发生这种情况
        const finalName = filename || `unknown_${Date.now()}.jpg`;

        // 试图从文件名中提取作品 ID, 例如 105055450_p0.jpg -> 105055450
        const match = finalName.match(/^(\d+)_p\d+\./);
        const illustId = match ? match[1] : 'unknown';

        // 拼接路径: cache/pixiv/<illustId>/<finalName>
        return `cache/pixiv/${illustId}/${finalName}`;
    }

    /**
     * 获取下载资源时的请求头
     * 重写父类方法
     */
    getDownloadHeaders(url, headers) {
        return {
            Referer: 'https://www.pixiv.net/',
            Cookie: this.pixivCookie || '',
            ...headers
        };
    }

    /**
     * 批量处理: 把 Pixiv 原图 URLs 映射为 S3 URLs, 并做去重与并发控制
     * 适配父类接口
     */
    async batchCacheResources(urls, concurrency = 5) {
        // 调用父类方法, 固定 prefix 为 'pixiv'
        // headers 可以在这里传空, 因为 getDownloadHeaders 会自动注入
        return super.batchCacheResources(urls, 'pixiv', {}, concurrency);
    }
}

module.exports = PixivProxy;
