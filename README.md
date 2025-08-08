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

## 环境变量

| 变量名 | 说明 | 默认值 |
| ------- | ------- | ------- |
| PORT | 监听的端口号 | 3000 |
| TOKEN | 后端令牌，用于鉴权，需要自己设置 | default_token |
