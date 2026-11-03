/**
 * 元书输入法 · 文本润色优化脚本
 * 
 * 用法：
 *   在脚本面板的输入框里打字，或选中文本，或复制文本，点这个脚本。
 *   想换风格，在文字前面加风格词再空一格，例如「正式 我明天去找你」：
 *   简洁 / 正式 / 学术 / 生动 / 商务
 *   （不加风格词，默认执行普通优化）
 * 
 * 输入来源（按优先级）：脚本输入框 $searchText → 键盘选中文本 $selectedText → 剪贴板 $pasteboardContent
 * 
 * 要改的地方只有下面「设置」这一块。自动读取公共变量，实现多个脚本共享配置。
 */

// ============== 设置 ==============

// 优先读取你在「脚本变量管理」里设置的公共变量，实现所有脚本共用配置
const API_CONFIG = {
  BASE_URL: (typeof $BASE_URL !== "undefined" && $BASE_URL) ? $BASE_URL : "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
  MODEL: (typeof $MODEL !== "undefined" && $MODEL) ? $MODEL : "ep-请换成你自己的接入点ID",
  API_KEY: (typeof $free_deepseek_key !== "undefined" && $free_deepseek_key) ? $free_deepseek_key : ""
};

// ============================================

// 润色风格映射
const POLISH_STYLES = {
  "简洁": "简洁",
  "正式": "正式", 
  "学术": "学术",
  "生动": "生动",
  "商务": "商务"
};

async function output() {
  // 按优先级获取输入内容：输入框 -> 选中文本 -> 剪贴板
  const a = (typeof $searchText !== "undefined") ? $searchText : "";
  const b = (typeof $selectedText !== "undefined") ? $selectedText : "";
  const c = (typeof $pasteboardContent !== "undefined") ? $pasteboardContent : "";
  const text = (a && a.trim()) || (b && b.trim()) || (c && c.trim()) || "";

  if (!text) {
    return "请输入需要润色的文本";
  }
  
  return await polishText(text.trim());
}

async function polishText(text) {
  try {
    // 加上 trim() 防止变量带入意外空格，导致判断失败
    const key = (API_CONFIG.API_KEY || "").trim();
    const url = (API_CONFIG.BASE_URL || "").trim();
    const model = (API_CONFIG.MODEL || "").trim();

    // 如果找不到密钥、地址或模型，就退回到本地笨办法
    if (!key || !url || !model) {
      return enhancedLocalPolish(text);
    }
    
    // 调用 AI 进行智能润色
    const apiResult = await callPolishAPI(text);
    if (apiResult && apiResult.trim() && apiResult !== text) {
      return apiResult.trim();
    }
  } catch (error) {
    // 如果接口报错，捕获异常并走本地兜底
    $log("润色接口错误: " + error.message);
  }
  
  return enhancedLocalPolish(text);
}

async function callPolishAPI(text) {
  if (!text || text.trim() === "") return "";
  
  let polishStyle = "优化";
  let originalText = text;

  // 解析前面有没有加风格词（比如“学术 xxx”）
  const prefixMatch = text.match(/^(\S+)\s+(.+)/);
  if (prefixMatch && POLISH_STYLES[prefixMatch[1]]) {
    polishStyle = POLISH_STYLES[prefixMatch[1]];
    originalText = prefixMatch[2];
  }
  
  const messages = [
    {
      role: "system",
      content: "你是一个严谨的文本润色助手。只输出润色后的文本，不要加任何解释。"
    },
    {
      role: "user",
      content: `请将以下文本润色为更${polishStyle}的表达方式：${originalText}`
    }
  ];
  
  const response = await $http({
    url: API_CONFIG.BASE_URL,
    method: "POST",
    header: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_CONFIG.API_KEY.trim()}`
    },
    body: {
      model: API_CONFIG.MODEL.trim(),
      messages: messages,
      temperature: 0.7,
      max_tokens: 500
    },
    timeout: 30
  });
  
  if (response.response.statusCode === 200) {
    const data = JSON.parse(response.data);
    return data.choices[0].message.content;
  } else {
    throw new Error(`HTTP ${response.response.statusCode}`);
  }
}

// ============== 本地兜底方案（不联网时的死板替换） ==============
function enhancedLocalPolish(text) {
  if (!text || text.trim() === "") return "";
  
  let polishStyle = "优化";
  let originalText = text;

  const prefixMatch = text.match(/^(\S+)\s+(.+)/);
  if (prefixMatch && POLISH_STYLES[prefixMatch[1]]) {
    polishStyle = POLISH_STYLES[prefixMatch[1]];
    originalText = prefixMatch[2];
  }

  let optimized = originalText;
  optimized = optimized.replace(/\s+/g, ' ').trim();
  
  switch(polishStyle) {
    case "简洁":
      optimized = optimized
        .replace(/非常|很|特别|相当/g, '')
        .replace(/的+/, '的')
        .replace(/了+/, '了');
      break;
      
    case "正式":
      optimized = optimized
        .replace(/我/g, '本人')
        .replace(/你/g, '您')
        .replace(/咱们/g, '我们')
        .replace(/啥/g, '什么')
        .replace(/咋/g, '如何');
      break;
      
    case "学术":
      optimized = optimized
        .replace(/我觉得/g, '笔者认为')
        .replace(/我认为/g, '本研究认为')
        .replace(/很明显/g, '显而易见');
      break;
      
    case "生动":
      optimized = optimized
        .replace(/很好/g, '精彩绝伦')
        .replace(/漂亮/g, '美轮美奂')
        .replace(/快/g, '迅捷');
      break;
      
    case "商务":
      optimized = optimized
        .replace(/我/g, '本公司')
        .replace(/你/g, '贵方')
        .replace(/合作/g, '战略合作');
      break;
  }
  
  optimized = optimized
    .replace(/([^。!?！？])$/, '$1。')
    .replace(/，$/, '。');
  
  return optimized;
}