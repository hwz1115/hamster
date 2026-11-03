// 版本：v1（2026-11-03）
/**
 * 元书输入法 · 翻译脚本
 * 基于群里的《字节火山引擎翻译(2).js》整理修改，写法和 $http 的用法保持不变。
 *
 * 用法：
 *   在脚本面板的输入框里打字，点这个脚本。
 *   中文会翻成英文，其他语言会翻成中文。
 *   想翻成别的语言，在文字前面加一个字再空一格，例如「日 你好」：
 *   法=法语 日=日语 韩=韩语 德=德语 俄=俄语 西=西班牙语 意=意大利语 粤=粤语
 *
 * 输入来源（按优先级）：脚本输入框 $searchText → 键盘选中文本 $selectedText → 剪贴板 $pasteboardContent
 *   （读取剪贴板需要打开「访问系统剪贴板」开关）
 *
 * 要改的地方只有下面「设置」这一块。
 */

// ============== 设置（只改这里）==============

// 接口地址。
// 用火山方舟：保持下面这行不变。
// 用你自己的 OpenAI 格式接口：改成 https://你的域名/v1/chat/completions
// var BASE_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

// 模型。
// 火山方舟：填你自己创建的「接入点 ID」，形如 ep-xxxxxxxx-xxxxx
// 自己的接口：填模型名，例如 deepseek-chat
// var MODEL = "ep-请换成你自己的接入点ID";

// 密钥。推荐在元书里设置环境变量 free_deepseek_key（和原脚本一致）。
// 找不到环境变量的地方，也可以直接填在下面这一行引号里（注意别把脚本发给别人）。
// var API_KEY_INLINE = "";

// 优先读取你在「脚本变量管理」里设置的变量，如果没有设置，则使用后面的备用值
var BASE_URL = (typeof $BASE_URL !== "undefined" && $BASE_URL) ? $BASE_URL : "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
var MODEL = (typeof $MODEL !== "undefined" && $MODEL) ? $MODEL : "ep-请换成你自己的接入点ID";
var API_KEY_INLINE = ""; // 这里留空，密钥会从下面自动读取

// ============================================

var TEMPERATURE = 0.1;
var MAX_TOKENS = 2048;
var TIMEOUT_SEC = 60;

var LANGUAGE_MAP = {
    "法": "French", "日": "Japanese", "韩": "Korean", "德": "German",
    "俄": "Russian", "西": "Spanish", "意": "Italian", "粤": "Cantonese"
};

function getKey() {
    var envKey = (typeof $free_deepseek_key !== "undefined") ? $free_deepseek_key : "";
    return (envKey || API_KEY_INLINE || "").trim();
}

function getInput() {
    var a = (typeof $searchText !== "undefined") ? $searchText : "";
    var b = (typeof $selectedText !== "undefined") ? $selectedText : "";
    var c = (typeof $pasteboardContent !== "undefined") ? $pasteboardContent : "";
    return ((a && a.trim()) || (b && b.trim()) || (c && c.trim()) || "");
}

async function translate(message) {
    var targetLanguage;
    var originalText = message;

    var prefixMatch = message.match(/^(\S)\s+([\s\S]+)/);
    if (prefixMatch && LANGUAGE_MAP[prefixMatch[1]]) {
        targetLanguage = LANGUAGE_MAP[prefixMatch[1]];
        originalText = prefixMatch[2];
    } else {
        targetLanguage = /[\u4e00-\u9fa5]/.test(message) ? "English" : "Chinese";
    }

    var key = getKey();
    if (!key) {
        throw new Error("没有找到密钥，请设置环境变量 free_deepseek_key，或填到脚本开头的 API_KEY_INLINE");
    }

    var messages = [
        {
            role: "system",
            content: "You are a strict machine translation engine. Only output the translation result."
        },
        {
            role: "user",
            content: "请将以下内容翻译成" + targetLanguage + "，只输出翻译结果：\n" + originalText
        }
    ];

    var response = await $http({
        url: BASE_URL,
        method: "POST",
        header: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + key
        },
        body: { messages: messages, model: MODEL, temperature: TEMPERATURE, max_tokens: MAX_TOKENS },
        timeout: TIMEOUT_SEC
    });

    if (response.response.statusCode !== 200) {
        var detail = "无详情";
        try {
            var errorData = JSON.parse(response.data);
            detail = (errorData.error && errorData.error.message) || errorData.msg || JSON.stringify(errorData);
        } catch (e) {
            detail = response.data || "无法解析的响应";
        }
        throw new Error("请求失败，状态码 " + response.response.statusCode + "：" + detail);
    }

    var data = JSON.parse(response.data);
    var text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    text = text ? text.trim() : "";
    if (!text) {
        throw new Error("接口返回的内容为空");
    }
    return text;
}

async function output() {
    var message = getInput();
    if (!message) {
        return ["请输入要翻译的文本。"];
    }
    try {
        var result = await translate(message);
        $log("translate ok");
        return result.split("\n");
    } catch (error) {
        var msg = (error && error.message) ? error.message : "未知错误";
        $log("翻译错误: " + msg);
        return ["抱歉，翻译失败：" + msg];
    }
}
