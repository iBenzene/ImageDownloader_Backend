// src/s3Client.js

const { S3Client, HeadObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");

/**
 * 创建 S3 客户端, 支持 Cloudflare R2、MinIO 等自定义 Endpoint 的 S3 服务
 */
const createS3Client = ({ endpoint, accessKeyId, secretAccessKey }) => {
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("S3 配置缺失: S3_ENDPOINT / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY");
  }

  return new S3Client({
    region: "auto", 
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
    tls: endpoint.startsWith("https://")
  });
}

/**
 * 判断对象是否已经存在
 */
const objectExists = async (s3, bucket, key) => {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    // NotFound / 404 -> 不存在
    return false;
  }
}

/**
 * 上传对象
 */
const putObject = async (s3, bucket, key, body, contentType) => {
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType || "application/octet-stream",
    CacheControl: "public,max-age=31536000,immutable"
  });
  await s3.send(cmd);
}

module.exports = { createS3Client, objectExists, putObject };
