export interface KeyboardEventLike {
  key: string
  code?: string
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
}

const isMacPlatform = (): boolean => {
  return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
}

const domCodeToKey: Record<string, string> = {
  Space: 'Space',
  Enter: 'Enter',
  Tab: 'Tab',
  Escape: 'Escape',
  Backspace: 'Backspace',
  Delete: 'Delete',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Slash: '/',
  Backslash: '\\',
  BracketLeft: '[',
  BracketRight: ']',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Minus: '-',
  Equal: '=',
  Backquote: '`'
}

export const getShortcutFromKeyboardEvent = (e: KeyboardEventLike): string | null => {
  const isMac = isMacPlatform()

  // Ignore solo modifier keys
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
    return null
  }

  const modifiers: string[] = []
  if (isMac) {
    if (e.metaKey) modifiers.push('CommandOrControl')
    if (e.ctrlKey) modifiers.push('Ctrl')
  } else {
    if (e.ctrlKey) modifiers.push('CommandOrControl')
    if (e.metaKey) modifiers.push('Meta')
  }

  if (e.altKey) modifiers.push('Alt')
  if (e.shiftKey) modifiers.push('Shift')

  // Extract non-modifier key from code or key
  let mainKey: string | null = null

  if (e.code) {
    if (e.code.startsWith('Key')) {
      mainKey = e.code.slice(3).toUpperCase()
    } else if (e.code.startsWith('Digit')) {
      mainKey = e.code.slice(5)
    } else if (e.code.startsWith('Numpad') && !isNaN(Number(e.code.slice(6)))) {
      mainKey = e.code.slice(6)
    } else if (/^F([1-9]|1[0-9]|2[0-4])$/i.test(e.code)) {
      mainKey = e.code.toUpperCase()
    } else if (domCodeToKey[e.code]) {
      mainKey = domCodeToKey[e.code]
    }
  }

  if (!mainKey && e.key && e.key.length === 1 && /^[a-zA-Z0-9]$/.test(e.key)) {
    mainKey = e.key.toUpperCase()
  }

  if (!mainKey) {
    return null
  }

  const isFKey = /^F([1-9]|1[0-9]|2[0-4])$/i.test(mainKey)
  // Require at least one modifier key unless it's an F-key
  if (modifiers.length === 0 && !isFKey) {
    return null
  }

  return [...modifiers, mainKey].join('+')
}

export const formatKeyDisplay = (key: string, isMac = isMacPlatform()): string => {
  switch (key.toLowerCase()) {
    case 'ctrl':
    case 'control':
      return isMac ? '⌃' : 'Ctrl'
    case 'command':
    case 'cmd':
      return isMac ? '⌘' : 'Win'
    case 'commandorcontrol':
      return isMac ? '⌘' : 'Ctrl'
    case 'alt':
    case 'option':
      return isMac ? '⌥' : 'Alt'
    case 'shift':
      return isMac ? '⇧' : 'Shift'
    case 'meta':
      return isMac ? '⌘' : 'Win'
    default:
      return key.toUpperCase()
  }
}

export const formatShortcutKeys = (shortcut: string): string[] => {
  if (!shortcut) return ['Alt', 'S']
  const isMac = isMacPlatform()
  return shortcut.split('+').map((k) => formatKeyDisplay(k.trim(), isMac))
}
