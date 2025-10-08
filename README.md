# 苯苯存图（后端）

将前端中与 UI 无关的代码分离，单独部署。

## 快速开始

``` bash
sudo docker run -p 3000:3000 -e TOKEN=your_token ghcr.io/ibenzene/image-downloader_backend
```
或者

``` yaml
services:
  backend:
    image: ghcr.io/ibenzene/image-downloader_backend
    container_name: image-downloader_backend
    ports:
      - 3000:3000
    environment:
      - TOKEN=your_token
```

### 环境变量

| 变量名 | 说明 | 默认值 |
| ------- | ------- | ------- |
| PORT | 监听的端口号 | 3000 |
| TOKEN | 后端令牌，用于鉴权，需要自己设置 | default_token |
| PIXIV_COOKIE | 如需使用 Pixiv 图片下载器，请自行通过浏览器抓包获取 Pixiv Cookie | - |
| PIXIV_PROXY_ENABLED | 让后端代理 Pixiv 图片的下载，缓存到 S3 对象存储服务中，建议启用 | true |
| S3_ENDPOINT | 符合 S3 规范的对象存储服务器，包括 Amazon S3、Cloudflare R2、MinIO 等 | - |
| S3_BUCKET | S3 存储桶的名称 | - |
| S3_ACCESS_KEY_ID | S3 服务的访问凭证 | - |
| S3_SECRET_ACCESS_KEY | S3 服务的访问密钥 | - |
| S3_PUBLIC_BASE | S3 存储的访问路径，可以使用 CDN 或自定义域名，支持 virtual-hosted-style 的访问方式 | - |

### 代理下载

目前服务端支持代理下载 Pixiv 的图片。

‼️ 如需使用代理下载功能，请配置好 S3 对象存储服务的相关环境变量，并将服务端部署到**海外服务器**上。
