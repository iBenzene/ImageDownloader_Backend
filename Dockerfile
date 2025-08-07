FROM node:24-alpine

# 设置工作目录
WORKDIR /usr/src/app

# 复制 package.json 到工作目录
COPY package.json ./

# 安装项目依赖
RUN npm install --only=production

# 复制项目文件
COPY . .

# 暴露端口
EXPOSE 3000

# 定义环境变量
ENV NODE_ENV=production

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# 更改文件的所有者
RUN chown -R nodejs:nodejs /usr/src/app
USER nodejs

# 启动应用
CMD ["npm", "start"]
