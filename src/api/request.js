import axios from "axios";
import { API_CONFIG } from "./config";

class Request {
  constructor(config) {
    this.config = { ...API_CONFIG, ...config };
    this.instance = axios.create(this.config);

    // 请求拦截器
    this.instance.interceptors.request.use(
      (config) => {
        // 优先使用新的 token 认证方式
        const tokenName = this.getTokenName();
        const tokenValue = this.getTokenValue();
        
        if (tokenName && tokenValue) {
          // 使用新的 token 认证，添加到请求头
          config.headers[tokenName] = tokenValue;
        } else {
          // 回退到旧的 apiKey 方式（保持兼容性）
          const apiKey = this.getApiKey();
          if (apiKey) {
            // 检查是否是文件上传请求
            const isFileUpload =
              config.headers["Content-Type"] === "multipart/form-data";

            if (isFileUpload) {
              // 文件上传请求，将apiKey添加到URL参数中
              config.url = `${config.url}${
                config.url.includes("?") ? "&" : "?"
              }apiKey=${apiKey}`;
            } else if (config.method === "get") {
              // GET 请求将 apiKey 添加到 URL 参数中
              config.params = {
                ...config.params,
                apiKey: apiKey,
              };
            } else {
              // 其他 POST 请求将 apiKey 添加到请求体中
              config.data = {
                ...config.data,
                apiKey: apiKey,
              };
            }
          }
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response) => {
        const res = response.data;
        console.log("API响应:", res);

        // 处理认证失败的情况（token 或 API Key 无效）
        if (res.code === -1 || res.code === 401) {
          if (res.msg === "Invalid API Key" || res.msg.includes("API Key") || 
              res.msg.includes("未登录") || res.msg.includes("token")) {
            this.clearApiKey();
            this.clearToken();
            // 触发登录失效事件
            window.dispatchEvent(new CustomEvent("fishpi:login-invalid"));
          }
          // 触发错误消息事件
          window.dispatchEvent(
            new CustomEvent("fishpi:error", {
              detail: {
                message: res.msg || "请求失败",
                code: res.code,
              },
            })
          );
          return Promise.reject(new Error(res.msg || "请求失败"));
        }

        // 返回响应数据
        return res;
      },
      (error) => {
        console.error("API错误:", error);
        return Promise.reject(error);
      }
    );
  }

  // 获取 Token Name
  getTokenName() {
    return utools.dbStorage.getItem("tokenName");
  }

  // 获取 Token Value
  getTokenValue() {
    return utools.dbStorage.getItem("tokenValue");
  }

  // 设置 Token
  setToken(tokenName, tokenValue) {
    utools.dbStorage.setItem("tokenName", tokenName);
    utools.dbStorage.setItem("tokenValue", tokenValue);
  }

  // 清除 Token
  clearToken() {
    utools.dbStorage.removeItem("tokenName");
    utools.dbStorage.removeItem("tokenValue");
  }

  // 获取 API Key（保持兼容性）
  getApiKey() {
    return utools.dbStorage.getItem("fishpi_api_key");
  }

  // 设置 API Key（保持兼容性）
  setApiKey(apiKey) {
    utools.dbStorage.setItem("fishpi_api_key", apiKey);
  }

  // 清除 API Key（保持兼容性）
  clearApiKey() {
    utools.dbStorage.removeItem("fishpi_api_key");
  }

  // GET 请求
  async get(path, params = {}) {
    return this.instance.get(path, { params });
  }

  // POST 请求
  async post(path, data = {}) {
    return this.instance.post(path, data);
  }

  // PUT 请求
  async put(path, data = {}) {
    return this.instance.put(path, data);
  }

  // DELETE 请求
  async delete(path) {
    return this.instance.delete(path);
  }

  // 文件上传
  async upload(path, files) {
    const formData = new FormData();
    // 只添加文件到formData
    files.forEach((file) => {
      formData.append("file[]", file);
    });

    return this.instance.post(path, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  }
}

export const request = new Request();
