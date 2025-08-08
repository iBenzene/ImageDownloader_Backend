// src/parsingResponse.js

const vm = require("vm");

/** 解析响应的文本, 提取资源的 URL */
const parsingResponse = (response, downloader) => {
	switch (downloader) {
		case "小红书图片下载器":
			return extractUrlsFromHtml(
				response,
				/<meta\s+name="og:image"\s+content="([^"]+)"/g
			);
		case "小红书实况图片下载器":
			return extractLivePhotoUrls(response);
		case "小红书视频下载器":
			return extractUrlsFromHtml(
				response,
				/<meta\s+name="og:video"\s+content="([^"]+)"/g
			);
		case "米游社图片下载器":
			return extractUrlsFromJson(
				response,
				downloader
			);
		case "微博图片下载器":
			return extractUrlsFromJson(
				response,
				downloader
			);
		default:
			return [];
	}
};

module.exports = parsingResponse;

/** 确保 URL 使用的是 HTTPS 协议 */
const ensureHttps = (url) => {
	if (url.startsWith("http://")) {
		return url.replace("http://", "https://");
	}
	return url;
};

/** 从 HTML 文本中提取资源的 URL */
const extractUrlsFromHtml = (response, regex) => { // 小红书图片下载器、小红书视频下载器
	const html = response.data;
	if (typeof html !== "string") {
		console.error(`[${new Date().toLocaleString()}] 响应不是 HTML 文本`);
		return [];
	}

	const urls = [];
	let match;
	while ((match = regex.exec(html)) !== null) {
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

/** 从 JSON 数据中提取资源的 URL */
const extractUrlsFromJson = (response, downloader) => { // 米游社图片下载器、微博图片下载器
	const data = response.data;
	if (!data || typeof data !== "object") {
		console.error(`[${new Date().toLocaleString()}] 响应不是 JSON 数据`);
		return [];
	}

	const urls = [];
	switch (downloader) {
		case "米游社图片下载器":
			data.data.post.post.images.forEach(image => {
				const url = ensureHttps(image);
				urls.push(url);
			});
			return urls;
		case "微博图片下载器":
			data.pic_ids.forEach(picId => {
				const url = `https://wx1.sinaimg.cn/large/${picId}.jpg`;
				urls.push(ensureHttps(url));
			});
			return urls;
		default:
			return [];
	}
};

/** 提取小红书实况封面和视频的 URL */
const extractLivePhotoUrls = (response) => {
	const html = response.data;
	if (typeof html !== "string") {
		console.error(`[${new Date().toLocaleString()}] 响应不是 HTML 文本`);
		return [];
	}
	const state = extractInitialState(html);
	if (!state) return [];

	// 路径: id = note.firstNoteId -> note.noteDetailMap[id].note.imageList
	const firstId = state?.note?.firstNoteId;
	const imageList = firstId
		? state?.note?.noteDetailMap?.[firstId]?.note?.imageList
		: // 兜底: 若没有 firstNoteId 属性, 则尝试拿 noteDetailMap 的第一条
		Object.values(state?.note?.noteDetailMap || {})[0]?.note?.imageList;

	if (!Array.isArray(imageList)) return [];

	const urls = [];
	try {
		imageList.forEach((item, index) => {
			if (item.urlDefault) {
				const imageUrl = ensureHttps(item.urlDefault);

				// 检查是否为实况图片
				if (item.livePhoto && item.stream) {
					// 查找第一个可用的视频编码格式
					const videoUrl = getFirstAvailableVideoUrl(item.stream);

					if (videoUrl) {
						// 实况图片: 同时返回封面和视频
						urls.push({
							cover: imageUrl,
							video: ensureHttps(videoUrl),
						});
					} else {
						// 标记为实况图片但没有视频URL, 当作普通图片处理
						console.warn(
							`[${new Date().toLocaleString()}] 实况图片 ${index + 1} 没有可用的视频 URL, 将其当作普通图片处理`
						);
						urls.push({
							cover: imageUrl,
							video: null,
						});
					}
				} else {
					// 普通图片
					urls.push({
						cover: imageUrl,
						video: null,
					});
				}
			}
		});
	} catch (error) {
		console.error(`[${new Date().toLocaleString()}] 解析 imageList 时出错: ${error}`);
	}

	return urls;
};

/** 从 stream 对象中获取第一个可用视频的 URL */
const getFirstAvailableVideoUrl = (stream) => {
	// 按优先级检查不同的视频编码格式
	const codecPriority = ["av1", "h266", "h265", "h264"];

	for (const codec of codecPriority) {
		if (
			stream[codec] &&
			Array.isArray(stream[codec]) &&
			stream[codec].length > 0
		) {
			const codecData = stream[codec][0]; // 选择第一个编码选项
			if (codecData.masterUrl) {
				return codecData.masterUrl;
			}
		}
	}

	// 如果没有找到预期的视频编码格式, 检查其他可能的属性
	console.warn(`[${new Date().toLocaleString()}] 在 stream 对象中未找到预期的视频编码格式, 检查其他可能的属性`);
	for (const key in stream) {
		if (Array.isArray(stream[key]) && stream[key].length > 0) {
			const codecData = stream[key][0];
			if (codecData && codecData.masterUrl) {
				return codecData.masterUrl;
			}
		}
	}

	return null;
};

/** 从 HTML 中提取 window.__INITIAL_STATE__ 对象 */
const extractInitialState = html => {
	if (typeof html !== "string") throw new Error("html must be a string");

	const assignIdx = html.indexOf("window.__INITIAL_STATE__");
	if (assignIdx === -1) return null;

	// 找到等号后的第一个 "{"
	const eqIdx = html.indexOf("=", assignIdx);
	if (eqIdx === -1) return null;

	let i = eqIdx + 1;

	// 跳过空白
	while (i < html.length && /\s/.test(html[i])) i++;
	if (html[i] !== "{") return null;

	// 简单大括号配对, 考虑字符串与转义
	let brace = 0, inStr = false, strQuote = "", escape = false;
	const start = i;
	for (; i < html.length; i++) {
		const ch = html[i];

		if (inStr) {
			if (escape) {
				escape = false;
			} else if (ch === "\\") {
				escape = true;
			} else if (ch === strQuote) {
				inStr = false;
			}
			continue;
		}

		if (ch === "'" || ch === '"') {
			inStr = true;
			strQuote = ch;
			continue;
		}
		if (ch === "{") brace++;
		if (ch === "}") {
			brace--;
			if (brace === 0) {
				// i 指向最后一个 '}'
				break;
			}
		}
	}

	if (brace !== 0) return null;

	let objLiteral = html.slice(start, i + 1);

	// 把 \u002F 还原为 /
	objLiteral = objLiteral.replace(/\\u002F/g, "/");

	// JSON/JS 兼容: 把 ": undefined" 替换为 ": null"
	// 只处理键值对语境, 避免误伤字符串
	objLiteral = objLiteral.replace(/:\s*undefined\b/g, ": null");

	// 在 VM 沙箱里只返回这段对象
	const sandbox = {};
	const script = new vm.Script("(" + objLiteral + ")");
	const context = vm.createContext(sandbox);
	const state = script.runInContext(context, { timeout: 50 });

	return state;
};
