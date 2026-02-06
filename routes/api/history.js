// routes/api/history.js

const express = require("express");
const router = express.Router();

const { getApp } = require("../../utils/common");
const { createS3Client, getObject, putObject } = require("../../src/s3Client");

const HISTORY_KEY = "cache/history.json";

/**
 * Merge client records with server records
 * Conflict resolution: keep the record with the latest updated_at
 */
const mergeRecords = (serverRecords, clientRecords) => {
    const recordMap = new Map();

    // Add server records to map
    for (const record of serverRecords) {
        recordMap.set(record.id, record);
    }

    // Merge client records, keeping the one with latest updated_at
    for (const clientRecord of clientRecords) {
        const existingRecord = recordMap.get(clientRecord.id);
        if (!existingRecord) {
            recordMap.set(clientRecord.id, clientRecord);
        } else {
            const existingTime = new Date(existingRecord.updated_at).getTime();
            const clientTime = new Date(clientRecord.updated_at).getTime();
            if (clientTime > existingTime) {
                recordMap.set(clientRecord.id, clientRecord);
            }
        }
    }

    return Array.from(recordMap.values());
}

/**
 * POST /v1/history/sync
 * Incremental sync history records
 * 
 * Query params:
 *   - token: authentication token (required)
 *   - since: ISO8601 timestamp, return records updated after this time (optional)
 * 
 * Body:
 *   - records: array of history records to sync (optional)
 */
router.post("/sync", async (req, res) => {
    const { token, since } = req.query;
    const app = getApp();

    // Authenticate
    if (token !== app.get("token")) {
        return res.status(401).json({ error: "认证失败" });
    }

    try {
        // Get S3 client config
        const s3 = createS3Client({
            endpoint: app.get("s3Endpoint"),
            accessKeyId: app.get("s3AccessKeyId"),
            secretAccessKey: app.get("s3SecretAccessKey")
        });
        const bucket = app.get("s3Bucket");

        // Read existing records from S3
        const existingData = await getObject(s3, bucket, HISTORY_KEY);
        let serverRecords = [];
        if (existingData) {
            try {
                serverRecords = JSON.parse(existingData);
            } catch (parseError) {
                console.error(`[${new Date().toLocaleString()}] 解析历史记录失败: ${parseError.message}`);
                serverRecords = [];
            }
        }

        // Merge with client records if provided
        const clientRecords = req.body?.records || [];
        if (clientRecords.length > 0) {
            serverRecords = mergeRecords(serverRecords, clientRecords);
            // Write back to S3
            await putObject(s3, bucket, HISTORY_KEY, JSON.stringify(serverRecords, null, 2), "application/json");
            console.log(`[${new Date().toLocaleString()}] 同步历史记录成功, 共 ${serverRecords.length} 条记录`);
        }

        // Filter records by since parameter
        let recordsToReturn = serverRecords;
        if (since) {
            const sinceTime = new Date(since).getTime();
            recordsToReturn = serverRecords.filter(record => {
                const recordTime = new Date(record.updated_at).getTime();
                return recordTime > sinceTime;
            });
        }

        res.json({
            records: recordsToReturn,
            syncedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error(`[${new Date().toLocaleString()}] 同步历史记录失败: ${error.message}`);
        res.status(500).json({ error: `同步历史记录失败: ${error.message}` });
    }
});

module.exports = router;
