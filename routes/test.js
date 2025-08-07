// routes/test.js

const express = require("express");
const router = express.Router();

// 测试接口
router.get("/", (req, res) => {
    res.send("OK");
});

module.exports = router;
