export interface UiCopy {
  other: string;
  yes: string;
  no: string;
  unanswered: string;
  notePlaceholder: string;
  otherPlaceholder: string;
  textPlaceholder: string;
  answerRequired: string;
  otherRequired: string;
  submit: string;
  submitting: string;
  submitted: string;
  retry: string;
  sendFailed: string;
  loading: string;
  noQuestions: string;
  connectionFailed: string;
  toolFailed: string;
  toolCancelled: string;
}

const english: UiCopy = {
  other: "Other",
  yes: "Yes",
  no: "No",
  unanswered: "Unanswered",
  notePlaceholder: "Additional details (optional)",
  otherPlaceholder: "Type your answer...",
  textPlaceholder: "Type your answer here...",
  answerRequired: "Please answer this question.",
  otherRequired: "Please type your answer.",
  submit: "Submit",
  submitting: "Submitting…",
  submitted: "Submitted",
  retry: "Try again",
  sendFailed: "Could not send your answer. Try again or copy this text into chat:",
  loading: "Loading questions…",
  noQuestions: "No questions were provided.",
  connectionFailed: "Unable to connect to the chat host.",
  toolFailed: "The question tool failed. Check the conversation for error details.",
  toolCancelled: "This question was cancelled.",
};

const chinese: UiCopy = {
  other: "其他",
  yes: "是",
  no: "否",
  unanswered: "未回答",
  notePlaceholder: "补充说明（可选）",
  otherPlaceholder: "请输入你的答案…",
  textPlaceholder: "请在此输入答案…",
  answerRequired: "请回答此问题。",
  otherRequired: "请输入你的答案。",
  submit: "提交",
  submitting: "正在提交…",
  submitted: "已提交",
  retry: "重试",
  sendFailed: "无法发送答案。请重试，或复制以下文本粘贴到聊天中：",
  loading: "正在加载问题…",
  noQuestions: "没有可显示的问题。",
  connectionFailed: "无法连接到聊天宿主。",
  toolFailed: "提问工具调用失败，请在对话中查看错误详情。",
  toolCancelled: "本次提问已取消。",
};

export function getCopy(locale?: string): UiCopy {
  return locale?.toLowerCase().startsWith("zh") ? chinese : english;
}
