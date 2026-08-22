import { session, app, ProxyConfig } from 'electron'
import { SettingsRepository } from '../db/repositories/settingsRepository'
import { TestProxyResult } from '../../renderer/src/types'
import { ProxyAgent, EnvHttpProxyAgent, Agent, setGlobalDispatcher } from 'undici'
import { Logger } from '../utils/logger'

const PROXY_ENV_KEYS = [
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'ALL_PROXY',
  'http_proxy',
  'https_proxy',
  'all_proxy',
  'NO_PROXY',
  'no_proxy'
]

/**
 * 全局网络代理配置与分发服务
 * 同时接管 Electron (Chromium) 会话 与 Node.js 主进程 (undici fetch)
 */

export class ProxyService {
  private static defaultAgent = new Agent()
  private static currentProxyAgent: ProxyAgent | null = null

  /** 同步与应用最新代理配置 */
  static async sync(): Promise<void> {
    const settings = SettingsRepository.get()
    const mode = settings?.system?.proxyMode || 'system'
    const customUrl = settings?.system?.customProxyUrl?.trim() || ''
    const bypassRules =
      settings?.system?.proxyBypassRules?.trim() || 'localhost,127.0.0.1,::1,*.local,<local>'

    let proxyConfig: ProxyConfig

    switch (mode) {
      case 'direct':
        proxyConfig = { mode: 'direct' }
        this.clearEnvironment()
        setGlobalDispatcher(this.defaultAgent)
        Logger.info('Proxy:Sync', '已切换至 [直连模式] (无代理)')
        break

      case 'custom':
        if (customUrl) {
          proxyConfig = {
            mode: 'fixed_servers',
            proxyRules: customUrl,
            proxyBypassRules: bypassRules
          }
          this.setEnvironment(customUrl, bypassRules)
          try {
            this.currentProxyAgent = new ProxyAgent(customUrl)
            setGlobalDispatcher(this.currentProxyAgent)
            Logger.info('Proxy:Sync', `已切换至 [自定义代理] -> ${customUrl}`)
          } catch (err) {
            Logger.warn('Proxy:Sync', `创建 undici ProxyAgent 失败: ${err}`)
          }
        } else {
          proxyConfig = { mode: 'direct' }
          this.clearEnvironment()
          setGlobalDispatcher(this.defaultAgent)
          Logger.info('Proxy:Sync', '自定义代理 URL 为空，回退至直连模式')
        }
        break

      case 'system':
      default:
        proxyConfig = { mode: 'system' }
        try {
          setGlobalDispatcher(new EnvHttpProxyAgent())
          Logger.info('Proxy:Sync', '已切换至 [系统代理模式] (继承操作系统 PAC/全局代理)')
        } catch {
          setGlobalDispatcher(this.defaultAgent)
        }
        break
    }

    try {
      if (session.defaultSession) {
        await session.defaultSession.setProxy(proxyConfig)
      }
      if (app.setProxy) {
        await app.setProxy(proxyConfig)
      }
    } catch (err) {
      Logger.error('Proxy:Sync', `设置 Chromium 代理失败: ${err}`)
    }
  }

  /** 检验代理服务器网络可用性与延迟 */
  static async testProxy(testUrl?: string): Promise<TestProxyResult> {
    const settings = SettingsRepository.get()
    const targetProxy = testUrl?.trim() || settings?.system?.customProxyUrl?.trim() || ''

    if (!targetProxy) {
      Logger.warn('Proxy:Test', '未填写自定义代理服务器地址')
      return { success: false, message: '请先填写自定义代理服务器地址' }
    }

    Logger.info('Proxy:Test', `测试代理连接: ${targetProxy} -> https://www.google.com/generate_204`)

    const startTime = Date.now()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)

    try {
      const probeAgent = new ProxyAgent(targetProxy)
      // 向高可用外网探测端点发起最小 GET 请求
      const response = await fetch('https://www.google.com/generate_204', {
        method: 'GET',
        // @ts-ignore (undici dispatcher support in Node fetch)
        dispatcher: probeAgent,
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      const latency = Date.now() - startTime
      if (response.status === 204 || response.ok) {
        Logger.success('Proxy:Test', `代理连接正常 · 延迟 ${latency}ms`)
        return {
          success: true,
          message: `代理连接正常 · 延迟 ${latency}ms`,
          latency
        }
      }

      Logger.error('Proxy:Test', `代理响应异常 (HTTP ${response.status})`)
      return {
        success: false,
        message: `代理响应异常 (HTTP ${response.status})`,
        latency
      }
    } catch (err: any) {
      clearTimeout(timeoutId)
      const latency = Date.now() - startTime
      if (err.name === 'AbortError') {
        Logger.error('Proxy:Test', `代理连接超时 (6s) -> ${targetProxy}`)
        return { success: false, message: '代理连接超时 (6s)，请确认本地代理服务已启动', latency }
      }
      Logger.error('Proxy:Test', `代理连接失败: ${err.message}`)
      return {
        success: false,
        message: `代理连接失败: ${err.message || '无法连接到代理服务器'}`,
        latency
      }
    }
  }

  private static setEnvironment(url: string, bypassRules: string): void {
    process.env.HTTP_PROXY = url
    process.env.HTTPS_PROXY = url
    process.env.ALL_PROXY = url
    process.env.http_proxy = url
    process.env.https_proxy = url
    process.env.all_proxy = url
    process.env.NO_PROXY = bypassRules
    process.env.no_proxy = bypassRules
  }

  private static clearEnvironment(): void {
    for (const key of PROXY_ENV_KEYS) {
      delete process.env[key]
    }
  }
}
