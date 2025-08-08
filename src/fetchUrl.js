// src/fetchUrl.js

const { default: axios } = require("axios");

const commonHeaders = {
    Accept: "*/*",
    "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

/** 发起网络请求, 获取包含目标资源 URL 的 HTML 文本或 JSON 数据 */
const fetchUrl = async (url, downloader) => {
    // 获取请求头和目标地址
    const headers = {
        ...commonHeaders,
        ...(await getHeaders(downloader)),
    };
    const targetUrl = getTargetUrl(url, downloader);

    // 向目标地址发起网络请求
    try {
        console.log(
            `[${new Date().toLocaleString()}] 🔗 向目标地址发起网络请求, headers: ${JSON.stringify(
                headers
            )}, targetUrl: ${targetUrl}`
        );

        return await axios.get(targetUrl, { headers });
    } catch (error) {
        throw new Error(`网络请求失败: ${error.message}`);
    }
};

module.exports = fetchUrl;

/** 获取网络请求的请求头 */
const getHeaders = async (downloader) => {
    switch (downloader) {
        case "米游社图片下载器":
            return {
                //（必不可少）防盗链
                Referer: "https://www.miyoushe.com/",
            };
        case "微博图片下载器": {
            // 请求生成一个游客 Cookie
            const cookie = await generateWeiboCookie();

            let subCookie = "";
            for (const cookieItem of cookie) {
                if (cookieItem.startsWith("SUB=")) {
                    // 只保留 SUB Cookie
                    subCookie = cookieItem;
                    console.log(`[${new Date().toLocaleString()}] 🍪 微博游客 Cookie: ${subCookie}`);
                    break;
                }
            }

            return {
                Cookie: subCookie,

                //（必不可少）防盗链
                Referer: "https://weibo.com/",
            };
        }
        default: // 小红书图片下载器、小红书视频下载器
            return {};
    }
};

/** 获取网络请求的目标 URL */
const getTargetUrl = (url, downloader) => {
    switch (downloader) {
        case "米游社图片下载器": {
            const miyousheId = url.split("/").pop();
            return `https://bbs-api.miyoushe.com/post/wapi/getPostFull?gids=2&post_id=${miyousheId}&read=1`;
        }
        case "微博图片下载器": {
            const weiboId = url.split("/").pop().split("?")[0];
            return `https://weibo.com/ajax/statuses/show?id=${weiboId}&locale=zh-CN`;
        }
        default: // 小红书图片下载器、小红书视频下载器
            return url;
    }
};

const generateWeiboCookie = async () => {
    const headers = {
        ...commonHeaders,

        //（必不可少）内容类型
        "Content-Type": "application/x-www-form-urlencoded",
    };
    const body = "cb=visitor_gray_callback&tid=&from=weibo";
    const response = await axios.post(
        "https://passport.weibo.com/visitor/genvisitor2",
        body,
        { headers }
    );

    return response.headers["set-cookie"];
};
