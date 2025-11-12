import { request } from "../api/request";
import { ElMessage } from "element-plus";

// 导出 WebSocket 后端地址常量
export const BACKEND_HOST_WS = 'wss://api.yucoder.cn/ws/?token=';

class WebSocketManager {
  constructor() {
    this.connections = new Map(); // 存储多个连接
    this.eventHandlers = new Map();
    this.reconnectAttempts = new Map();
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.isConnecting = new Map();
    this.isManualClose = new Map();
    this.reconnectTimers = new Map();
    this.heartbeatIntervals = new Map(); // 心跳定时器
    this.isMessageProcessingPaused = new Map(); // 消息处理暂停状态
    this.isWindowFocused = new Map(); // 窗口焦点状态
    this.messageHandlers = new Map(); // 按类型分组的消息处理器
    this.notificationIntervals = new Map(); // 通知定时器
    this.connectionOptions = new Map(); // 保存连接选项，用于重连
    this.originalUrls = new Map(); // 保存原始URL，用于重连
    
    // 监听窗口焦点变化
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        this.connections.forEach((_, connectionId) => {
          this.isWindowFocused.set(connectionId, true);
        });
      });
      
      window.addEventListener('blur', () => {
        this.connections.forEach((_, connectionId) => {
          this.isWindowFocused.set(connectionId, false);
        });
      });
    }
  }

  /**
   * 连接到 WebSocket 服务器
   * @param {string} url WebSocket 服务器地址
   * @param {Object} options 连接选项
   * @returns {Promise} 连接结果
   */
  connect(url, options = {}) {
    const connectionId = options.connectionId || url; // 使用 connectionId 或 url 作为唯一标识

    if (this.isConnecting.get(connectionId)) {
      return Promise.reject(new Error("正在连接中..."));
    }

    if (
      this.connections.has(connectionId) &&
      this.connections.get(connectionId).readyState === WebSocket.OPEN
    ) {
      return Promise.resolve(this.connections.get(connectionId));
    }

    this.isConnecting.set(connectionId, true);
    this.isManualClose.set(connectionId, false);
    this.isMessageProcessingPaused.set(connectionId, false);
    this.isWindowFocused.set(connectionId, document.hasFocus?.() ?? true);
    
    // 保存原始URL和选项，用于重连
    this.originalUrls.set(connectionId, url);
    this.connectionOptions.set(connectionId, options);

    // 如果URL是新的后端地址格式，使用token连接
    let websocketUrl = url;
    if (url === BACKEND_HOST_WS || url.startsWith(BACKEND_HOST_WS)) {
      const token = request.getTokenValue();
      if (token) {
        websocketUrl = `${BACKEND_HOST_WS}${token}`;
      } else {
        return Promise.reject(new Error("未找到token，无法建立连接"));
      }
    } else {
      // 旧的连接方式：如果URL已经包含了apiKey，直接使用
      // 如果URL不包含apiKey，则添加
      if (!url.includes("apiKey=")) {
        const apiKey = request.getApiKey();
        if (apiKey) {
          websocketUrl = `${url}${url.includes("?") ? "&" : "?"}apiKey=${apiKey}`;
        }
      }

      // 添加额外的参数
      if (options.params) {
        Object.entries(options.params).forEach(([key, value]) => {
          if (!websocketUrl.includes(`${key}=`)) {
            websocketUrl = `${websocketUrl}${
              websocketUrl.includes("?") ? "&" : "?"
            }${key}=${value}`;
          }
        });
      }
    }

    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(websocketUrl);
        this.connections.set(connectionId, ws);

        ws.onopen = () => {
          console.log(`WebSocket 连接已建立: ${connectionId}`);
          this.isConnecting.set(connectionId, false);
          this.reconnectAttempts.set(connectionId, 0);
          
          if (this.reconnectTimers.has(connectionId)) {
            clearTimeout(this.reconnectTimers.get(connectionId));
            this.reconnectTimers.delete(connectionId);
          }

          // 如果是新的后端地址，连接成功后发送登录消息
          if (url === BACKEND_HOST_WS || url.startsWith(BACKEND_HOST_WS)) {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 1, // 登录连接
              }));
            } else {
              ElMessage.error('WebSocket连接失败');
            }
          }

          // 启动心跳机制（仅对新后端地址）
          if (url === BACKEND_HOST_WS || url.startsWith(BACKEND_HOST_WS)) {
            this.startHeartbeat(connectionId);
          }

          resolve(ws);
        };

        ws.onclose = () => {
          console.log(`WebSocket 连接已关闭: ${connectionId}`);
          this.isConnecting.set(connectionId, false);
          
          // 清除心跳定时器
          if (this.heartbeatIntervals.has(connectionId)) {
            clearInterval(this.heartbeatIntervals.get(connectionId));
            this.heartbeatIntervals.delete(connectionId);
          }

          // 清除通知定时器
          if (this.notificationIntervals.has(connectionId)) {
            this.stopNotification(this.notificationIntervals.get(connectionId));
            this.notificationIntervals.delete(connectionId);
          }

          // 只有在非手动关闭的情况下才进行重连
          if (!this.isManualClose.get(connectionId)) {
            // 使用原始URL和选项进行重连，这样可以在重连时重新获取token
            const originalUrl = this.originalUrls.get(connectionId) || websocketUrl;
            const originalOptions = this.connectionOptions.get(connectionId) || options;
            this.handleReconnect(originalUrl, originalOptions, connectionId);
          }
        };

        ws.onerror = (error) => {
          console.error(`WebSocket 错误: ${connectionId}`, error);
          this.isConnecting.set(connectionId, false);
          ElMessage.error('连接发生错误');
          reject(error);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // 如果消息处理被暂停，直接丢弃聊天消息
            if (this.isMessageProcessingPaused.get(connectionId)) {
              // 只暂停聊天消息，其他类型的消息（如系统消息、错误消息等）仍然处理
              if (data.type === 'chat') {
                return; // 直接丢弃，不存储
              }
            }
            
            // 调用按类型分组的消息处理器
            const handlers = this.messageHandlers.get(data.type) || [];
            handlers.forEach(handler => {
              try {
                handler(data);
              } catch (error) {
                console.error('处理消息时出错:', error);
              }
            });

            // 如果是聊天消息且窗口未激活，则触发通知
            if (data.type === 'chat' && !this.isWindowFocused.get(connectionId)) {
              if (this.notificationIntervals.has(connectionId)) {
                this.stopNotification(this.notificationIntervals.get(connectionId));
              }
              const interval = this.startNotification(data.data?.content || '新消息');
              if (interval) {
                this.notificationIntervals.set(connectionId, interval);
              }
            }

            // 触发原有的消息处理逻辑
            this.handleMessage(data, connectionId);
          } catch (e) {
            console.error("消息解析错误:", e);
          }
        };
      } catch (error) {
        this.isConnecting.set(connectionId, false);
        reject(error);
      }
    });
  }

  /**
   * 处理重连逻辑（指数退避）
   * @param {string} url WebSocket 服务器地址
   * @param {Object} options 连接选项
   * @param {string} connectionId 连接标识
   */
  handleReconnect(url, options, connectionId) {
    if (this.isManualClose.get(connectionId)) {
      return;
    }

    const attempts = this.reconnectAttempts.get(connectionId) || 0;
    if (attempts < this.maxReconnectAttempts) {
      // 指数退避：Math.min(1000 * Math.pow(2, attempts), 10000)
      const timeout = Math.min(1000 * Math.pow(2, attempts), 10000);
      
      if (this.reconnectTimers.has(connectionId)) {
        clearTimeout(this.reconnectTimers.get(connectionId));
      }

      const timer = setTimeout(() => {
        this.reconnectAttempts.set(connectionId, attempts + 1);
        console.log(
          `尝试重连 ${connectionId} (${attempts + 1}/${
            this.maxReconnectAttempts
          })...`
        );
        this.connect(url, options);
      }, timeout);

      this.reconnectTimers.set(connectionId, timer);
    } else {
      console.log(`达到最大重连次数，停止重连: ${connectionId}`);
    }
  }

  /**
   * 启动心跳机制
   * @param {string} connectionId 连接标识
   */
  startHeartbeat(connectionId) {
    // 清除旧的心跳定时器
    if (this.heartbeatIntervals.has(connectionId)) {
      clearInterval(this.heartbeatIntervals.get(connectionId));
    }

    // 每25秒发送一次心跳
    const interval = setInterval(() => {
      const ws = this.connections.get(connectionId);
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 4, // 心跳消息类型
        }));
      }
    }, 25000);

    this.heartbeatIntervals.set(connectionId, interval);
  }

  /**
   * 启动通知
   * @param {string} content 通知内容
   * @returns {number|null} 定时器ID
   */
  startNotification(content) {
    // 这里可以实现通知逻辑，例如使用 utools.showNotification
    if (typeof utools !== 'undefined' && utools.showNotification) {
      utools.showNotification(content, 'fishpi');
      return Date.now(); // 返回一个标识
    }
    return null;
  }

  /**
   * 停止通知
   * @param {number} intervalId 定时器ID
   */
  stopNotification(intervalId) {
    // 如果需要停止通知，可以在这里实现
    // 目前 utools.showNotification 不支持停止，所以这里只是占位
  }

  /**
   * 暂停消息处理
   * @param {string} connectionId 连接标识
   */
  pauseMessageProcessing(connectionId) {
    this.isMessageProcessingPaused.set(connectionId, true);
  }

  /**
   * 恢复消息处理
   * @param {string} connectionId 连接标识
   */
  resumeMessageProcessing(connectionId) {
    this.isMessageProcessingPaused.set(connectionId, false);
  }

  /**
   * 注册按类型分组的消息处理器
   * @param {string} type 消息类型
   * @param {Function} handler 处理函数
   */
  onMessageType(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type).add(handler);
  }

  /**
   * 移除按类型分组的消息处理器
   * @param {string} type 消息类型
   * @param {Function} handler 处理函数
   */
  offMessageType(type, handler) {
    if (this.messageHandlers.has(type)) {
      this.messageHandlers.get(type).delete(handler);
    }
  }

  /**
   * 发送消息
   * @param {Object} data 要发送的数据
   * @param {string} connectionId 连接标识
   */
  send(data, connectionId) {
    const ws = this.connections.get(connectionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log(`发送消息到 ${connectionId}:`, data);
      ws.send(data);
    } else {
      console.error(`WebSocket 未连接: ${connectionId}`);
    }
  }

  /**
   * 关闭连接
   * @param {string} connectionId 连接标识
   */
  close(connectionId) {
    if (connectionId) {
      // 关闭指定连接
      this.isManualClose.set(connectionId, true);
      if (this.reconnectTimers.has(connectionId)) {
        clearTimeout(this.reconnectTimers.get(connectionId));
        this.reconnectTimers.delete(connectionId);
      }
      // 清除心跳定时器
      if (this.heartbeatIntervals.has(connectionId)) {
        clearInterval(this.heartbeatIntervals.get(connectionId));
        this.heartbeatIntervals.delete(connectionId);
      }
      // 清除通知定时器
      if (this.notificationIntervals.has(connectionId)) {
        this.stopNotification(this.notificationIntervals.get(connectionId));
        this.notificationIntervals.delete(connectionId);
      }
      // 清除保存的连接信息
      this.originalUrls.delete(connectionId);
      this.connectionOptions.delete(connectionId);
      const ws = this.connections.get(connectionId);
      if (ws) {
        ws.close();
        this.connections.delete(connectionId);
      }
    } else {
      // 关闭所有连接
      this.connections.forEach((ws, id) => {
        this.isManualClose.set(id, true);
        if (this.reconnectTimers.has(id)) {
          clearTimeout(this.reconnectTimers.get(id));
          this.reconnectTimers.delete(id);
        }
        // 清除心跳定时器
        if (this.heartbeatIntervals.has(id)) {
          clearInterval(this.heartbeatIntervals.get(id));
          this.heartbeatIntervals.delete(id);
        }
        // 清除通知定时器
        if (this.notificationIntervals.has(id)) {
          this.stopNotification(this.notificationIntervals.get(id));
          this.notificationIntervals.delete(id);
        }
        // 清除保存的连接信息
        this.originalUrls.delete(id);
        this.connectionOptions.delete(id);
        ws.close();
      });
      this.connections.clear();
      this.originalUrls.clear();
      this.connectionOptions.clear();
    }
  }

  /**
   * 注册事件处理器
   * @param {string} event 事件名称
   * @param {Function} handler 处理函数
   * @param {string} connectionId 连接标识
   */
  on(event, handler, connectionId) {
    const key = connectionId ? `${event}:${connectionId}` : event;
    if (!this.eventHandlers.has(key)) {
      this.eventHandlers.set(key, new Set());
    }
    this.eventHandlers.get(key).add(handler);
  }

  /**
   * 移除事件处理器
   * @param {string} event 事件名称
   * @param {Function} handler 处理函数
   * @param {string} connectionId 连接标识
   */
  off(event, handler, connectionId) {
    const key = connectionId ? `${event}:${connectionId}` : event;
    if (this.eventHandlers.has(key)) {
      this.eventHandlers.get(key).delete(handler);
    }
  }

  /**
   * 处理接收到的消息
   * @param {Object} data 接收到的数据
   * @param {string} connectionId 连接标识
   */
  handleMessage(data, connectionId) {
    // 触发特定连接的消息事件
    const specificKey = `message:${connectionId}`;
    if (this.eventHandlers.has(specificKey)) {
      this.eventHandlers.get(specificKey).forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`处理消息时出错:`, error);
        }
      });
    }

    // 触发全局消息事件
    if (this.eventHandlers.has("message")) {
      this.eventHandlers.get("message").forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`处理消息时出错:`, error);
        }
      });
    }
  }
}

// 创建单例实例
const wsManager = new WebSocketManager();

export default wsManager;
