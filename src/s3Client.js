// src/s3Client.js

const { S3Client, HeadObjectCommand, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");

/**
 * 将可读流转换为字符串
 */
const streamToString = async (stream) => {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString("utf-8");
}

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

/**
 * 读取对象内容, 如果对象不存在则返回 null
 */
const getObject = async (s3, bucket, key) => {
    try {
        const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        return await streamToString(response.Body);
    } catch (error) {
        if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
            return null;
        }
        throw error;
    }
}

module.exports = { createS3Client, objectExists, putObject, getObject };
