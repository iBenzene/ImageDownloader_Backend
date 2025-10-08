FROM node:24-alpine

# 设置工作目录, 复制 package.json 到工作目录
WORKDIR /usr/src/app
COPY package.json ./

# 安装项目依赖
RUN npm install --only=production

# 复制项目文件
COPY . .

# 定义环境变量, 暴露默认端口
EXPOSE 3080
ENV NODE_ENV=production

# 创建非 root 用户, 并更改文件的所有者
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

RUN chown -R nodejs:nodejs /usr/src/app
USER nodejs

# 启动应用
CMD ["npm", "start"]
