// 版本：v1（2026-11-03）
/**
 * 元书输入法 · 聊天回复脚本
 * 基于群里的《聊天回复.js》整理修改，写法和 $http 的用法保持不变。
 *
 * 用法：
 *   在脚本面板的输入框里粘贴或输入对方发来的消息，点这个脚本，
 *   AI 会用「我」的口气生成一条回复。
 *   想换风格，在消息前面加风格词再空一格，例如「幽默 周末有空吗」：
 *   简洁 / 正式 / 友好（默认）/ 幽默 / 高冷
 *
 * 输入来源（按优先级）：脚本输入框 $searchText → 键盘选中文本 $selectedText → 剪贴板 $pasteboardContent
 *   （读取剪贴板需要打开「访问系统剪贴板」开关）
 *
 * 要改的地方只有下面「设置」这一块。接口、模型、密钥和翻译脚本填一样的就行。
 */

// ============== 设置（只改这里）==============

// 接口地址（和翻译脚本里的 BASE_URL 一样）
// var BASE_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

// 模型（和翻译脚本里的 MODEL 一样）
// var MODEL = "ep-请换成你自己的接入点ID";

// 密钥：和翻译脚本一样，用环境变量 free_deepseek_key。
// 没设置环境变量的话，可以填在下面引号里（注意别把脚本发给别人）。
// var API_KEY_INLINE = "";


// 自动读取「脚本变量管理」里的变量，实现所有脚本共用配置
var BASE_URL = (typeof $BASE_URL !== "undefined" && $BASE_URL) ? $BASE_URL : "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
var MODEL = (typeof $MODEL !== "undefined" && $MODEL) ? $MODEL : "ep-请换成你自己的接入点ID";
var API_KEY_INLINE = ""; 

// ============================================

var TEMPERATURE = 0.8;
var MAX_TOKENS = 500;
var TIMEOUT_SEC = 60;

var REPLY_STYLES = {
    "简洁": "简洁直接",
    "正式": "正式礼貌",
    "友好": "友好亲切",
    "幽默": "幽默风趣",
    "高冷": "简短高冷"
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

async function generateReply(text) {
    var replyStyle = "友好亲切";
    var message = text;

    var prefixMatch = text.match(/^(\S+)\s+([\s\S]+)/);
    if (prefixMatch && REPLY_STYLES[prefixMatch[1]]) {
        replyStyle = REPLY_STYLES[prefixMatch[1]];
        message = prefixMatch[2];
    }

    var key = getKey();
    if (!key) {
        throw new Error("没有找到密钥，请设置环境变量 free_deepseek_key，或填到脚本开头的 API_KEY_INLINE");
    }

    var messages = [
        {
            role: "system",
            content: "你是一个帮助用户生成回复的助手。用户会给你一段对方发来的消息，你需要以第一人称“我”的口气，生成一个自然、合适的回复。\n" +
                "回复风格：" + replyStyle + "\n" +
                "规则：\n" +
                "1. 回复必须以“我”的口气，不要用“您”或第三人称\n" +
                "2. 只生成回复内容本身，不要加任何解释\n" +
                "3. 回复要自然，像真人对话\n" +
                "4. 如果对方是问句，就回答问题；如果是陈述句，就回应对方的内容"
        },
        {
            role: "user",
            content: "对方发来消息：“" + message + "”"
        }
    ];

    var response = await $http({
        url: BASE_URL,
        method: "POST",
        header: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + key
        },
        body: { model: MODEL, messages: messages, temperature: TEMPERATURE, max_tokens: MAX_TOKENS },
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
    var reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    reply = reply ? reply.trim() : "";
    if (!reply) {
        throw new Error("接口返回的内容为空");
    }
    return reply;
}

async function output() {
    var text = getInput();
    if (!text) {
        return ["请输入对方发来的消息。"];
    }
    try {
        var reply = await generateReply(text);
        $log("reply ok");
        return reply.split("\n").filter(function (l) { return l.trim() !== ""; });
    } catch (error) {
        var msg = (error && error.message) ? error.message : "未知错误";
        $log("回复错误: " + msg);
        return ["抱歉，生成回复失败：" + msg];
    }
}
