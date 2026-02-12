const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'commonjs',
            globals: {
                ...globals.node,
                ...globals.es2021,
            },
        },
        rules: {
            // 1) 由于是后端代码, 那么使用单引号
            'quotes': ['error', 'single'],

            // 2) 使用箭头函数, 且单参数不要有括号
            'arrow-parens': ['error', 'as-needed'],

            // 3) 结尾要有分号
            'semi': ['error', 'always'],

            // 4) 文件末尾留且只留一个空行
            'eol-last': ['error', 'always'],
            'no-multiple-empty-lines': ['error', { 'max': 1, 'maxEOF': 0 }],

            // 5) if 语句规则
            'curly': ['error', 'all'], // 始终需要大括号
            'brace-style': ['error', '1tbs', { 'allowSingleLine': true }], // 强制 1TBS 风格, 允许单行
            'block-spacing': ['error', 'always'], // 单行块内加空格
            'object-curly-spacing': ['error', 'always'], // 对象字面量内加空格

            // 其他推荐规则
            'no-unused-vars': 'warn',
            'no-console': 'off',
        },
    },
];
