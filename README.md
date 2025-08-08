# 苯苯存图（后端）

将前端中与 UI 无关的代码分离，单独部署。

## 快速开始

### Docker

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

### Vercel

TODO
