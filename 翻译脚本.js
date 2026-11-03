// 版本：v1.1（支持全变量读取）
/**
 * 元书输入法 · 翻译脚本
 */

// ============== 设置 ==============

// 优先读取你在「脚本变量管理」里设置的变量，如果没有设置，则使用后面的备用值
var BASE_URL = (typeof $BASE_URL !== "undefined" && $BASE_URL) ? $BASE_URL : "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
var MODEL = (typeof $MODEL !== "undefined" && $MODEL) ? $MODEL : "ep-请换成你自己的接入点ID";
var API_KEY_INLINE = ""; // 建议留空，密钥通过 $free_deepseek_key 变量读取

// ============================================

var TEMPERATURE = 0.1;
var MAX_TOKENS = 2048;
var TIMEOUT_SEC = 60;

var LANGUAGE_MAP = {
    "法": "French", "日": "Japanese", "韩": "Korean", "德": "German",
    "俄": "Russian", "西": "Spanish", "意": "Italian", "粤": "Cantonese"
};

function getKey() {
    // 优先读取变量 $free_deepseek_key，如果没有则用 API_KEY_INLINE
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
        throw new Error("没有找到密钥，请检查脚本变量管理里的 free_deepseek_key，或填到脚本开头的 API_KEY_INLINE");
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
