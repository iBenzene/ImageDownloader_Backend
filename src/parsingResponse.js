// src/parsingResponse.js

/** 解析响应的文本, 提取资源的 URL */
const parsingResponse = (response, downloader) => {
    switch (downloader) {
        case "小红书图片下载器":
            return [];
        case "小红书视频下载器":
            return extractUrls(text, /<meta\s+name="og:video"\s+content="([^"]+)"/g);
        case "米游社图片下载器":
            return extractUrls(text, /"images"\s*:\s*\[([^\]]+)\]/g, "", ",", true);
        case "微博图片下载器":
            return extractUrls(text, /"pic_ids"\s*:\s*\[([^\]]+)\]/g, "https://wx1.sinaimg.cn/large/", ",", true);
        default:
            return [];
    }
};

module.exports = parsingResponse;

/** 提取资源的 URL */
const extractUrls = (text, regex, prefix = "", delimiter = "", isJson = false) => {
    const urls = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        if (isJson) {
            const ids = match[1].replace(/"/g, "").split(delimiter);
            ids.forEach(id => urls.push(ensureHttps(prefix + id)));
        } else {
            const decodedUrl = (prefix + match[1]).replace(/\\u002F/g, "/");
            urls.push(ensureHttps(decodedUrl));
        }
    }
    return urls;
};

/** 确保 URL 使用的是 HTTPS 协议 */
const ensureHttps = url => {
    if (url.startsWith("http://")) {
        return url.replace("http://", "https://");
    }
    return url;
};
