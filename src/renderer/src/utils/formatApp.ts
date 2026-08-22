const BUNDLE_ID_MAP: Record<string, string> = {
  'com.google.chrome': 'Google Chrome',
  'com.google.chrome.canary': 'Google Chrome Canary',
  'com.apple.safari': 'Safari',
  'com.apple.notes': '备忘录',
  'com.apple.mail': '邮件',
  'com.apple.textedit': '文本编辑',
  'com.apple.preview': '预览',
  'com.apple.terminal': '终端',
  'com.apple.finder': '访达',
  'com.todesktop.230313mzl4w4u92': 'Cursor',
  'com.cursor.cursor': 'Cursor',
  cursor: 'Cursor',
  'com.microsoft.vscode': 'VS Code',
  'com.microsoft.vscodeinsiders': 'VS Code Insiders',
  code: 'VS Code',
  'com.tinyspeck.slackmacgap': 'Slack',
  slack: 'Slack',
  'com.jetbrains.intellij': 'IntelliJ IDEA',
  'com.jetbrains.intellij.ce': 'IntelliJ IDEA',
  'com.jetbrains.pycharm': 'PyCharm',
  'com.jetbrains.pycharm.ce': 'PyCharm',
  'com.jetbrains.webstorm': 'WebStorm',
  'company.thebrowser.browser': 'Arc',
  'com.brave.browser': 'Brave',
  'org.mozilla.firefox': 'Firefox',
  'com.microsoft.edgemac': 'Microsoft Edge',
  'com.readdle.smartemail-mac': 'Spark',
  'notion.id': 'Notion',
  'com.electron.notion': 'Notion',
  'com.linear': 'Linear',
  'com.hnc.discord': 'Discord',
  'com.tdesktop.telegram': 'Telegram',
  'ru.keepcoder.telegram': 'Telegram',
  'com.tencent.xinwechat': '微信',
  'com.feishu.feishu': '飞书',
  'com.alibaba.dingtalkmac': '钉钉',
  'com.colliderli.iina': 'IINA'
}

export function formatAppName(raw: string | undefined | null): string {
  if (!raw) return ''
  const trimmed = raw.trim()
  if (!trimmed) return ''

  const lower = trimmed.toLowerCase()
  if (BUNDLE_ID_MAP[lower]) {
    return BUNDLE_ID_MAP[lower]
  }

  // 如果包含形如 com.company.AppName 的 bundle id
  if (trimmed.includes('.')) {
    const parts = trimmed.split('.')
    const lastPart = parts[parts.length - 1]
    if (lastPart && lastPart.length > 1) {
      if (lower.startsWith('com.google.')) {
        return `Google ${lastPart}`
      }
      if (lower.startsWith('com.apple.')) {
        return lastPart
      }
      if (lower.startsWith('com.microsoft.')) {
        return `Microsoft ${lastPart}`
      }
      return lastPart
    }
  }

  return trimmed
}
