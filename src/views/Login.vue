<template>
  <div class="login-container">
    <!-- 左侧欢迎区域 -->
    <div class="login-left">
      <div class="welcome-content">
        <h2 class="welcome-title">Hi～欢迎来到摸鱼岛！</h2>
        <p class="welcome-text">
            如果你也是奋斗在一线、热爱工作的苦逼青年，那就快加入我们的友好大家庭吧！❤️
        </p>
        <p class="welcome-text">
          在这里，我们为你准备了 聊天室、每日热榜、还有满满生活感的帖子📝。这里的第一守则就是 「友善」🌈，你可以完全放开自己，和鱼油们畅所欲言💌，邂逅各行各业的搬砖人。
        </p>
        <p class="welcome-text">
          日常碎碎念🫖、闲聊八卦🗣️、生活小确幸、吐槽抱怨、各种提问、技术交流、读书分享、游戏竞技🎮、兴趣爱好🎨……在摸鱼岛 统统都能聊！
        </p>
      </div>
    </div>

    <!-- 右侧登录区域 -->
    <div class="login-right">
      <div class="login-content">
        <!-- 应用图标 -->
        <div class="app-icon-wrapper">
          <img src="/fishpi.png" alt="FishPi" class="app-icon" />
        </div>

        <!-- 登录表单 -->
        <div class="login-form-container">
          <div class="form-bubble">
            <!-- 账号输入 -->
            <div class="form-item">
              <input
                v-model="form.username"
                type="text"
                placeholder="请输入账号/邮箱"
                class="oval-input"
                @keyup.enter="handleLogin"
              />
            </div>

            <!-- 密码输入 -->
            <div class="form-item">
              <input
                v-model="form.password"
                type="password"
                placeholder="请输入密码"
                class="oval-input"
                @keyup.enter="handleLogin"
              />
            </div>

            <!-- 提交按钮 -->
            <div class="form-item">
              <button class="submit-btn" :disabled="loading" @click="handleLogin">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9 18L15 12L9 6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </div>

            <!-- 注册链接 -->
            <div class="register-wrapper">
              <span class="register-text">还没有账号？</span>
              <button class="register-link" @click.prevent="goToRegister">
                立即注册
              </button>
            </div>

            <!-- 协议复选框 -->
            <div class="agreement-wrapper">
              <label class="agreement-label">
                <input
                  v-model="agreed"
                  type="checkbox"
                  class="agreement-checkbox"
                />
                <span class="agreement-text">
                  登录即同意<button class="agreement-link" @click.prevent="goToAgreement">《用户协议》</button>和<button class="agreement-link" @click.prevent="goToPrivacy">《隐私政策》</button>
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from "vue";
import { userApi } from "../api";
import { request } from "../api";
import { useRouter } from "vue-router";

const router = useRouter();
const loading = ref(false);
const agreed = ref(true);

const form = reactive({
  username: "",
  password: "",
});

const handleLogin = async () => {
  if (!agreed.value) {
    utools.showNotification("请同意用户协议和隐私政策");
    return;
  }

  if (!form.username || !form.password) {
    utools.showNotification("请输入账号和密码");
    return;
  }

  try {
    loading.value = true;

    // 判断输入的是邮箱还是账号
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.username);
    let res;

    if (isEmail) {
      // 邮箱登录
      res = await userApi.userEmailLogin(form.username, form.password);
    } else {
      // 账号登录
      res = await userApi.userLogin(form.username, form.password);
    }

    if (res.code === 0 && res.data) {
      const loginData = res.data;

      // 保存 token 信息
      if (loginData.saTokenInfo) {
        request.setToken(
          loginData.saTokenInfo.tokenName,
          loginData.saTokenInfo.tokenValue
        );
      }

      // 保存用户信息
      utools.dbStorage.setItem("fishpi_user_info", loginData);

      // 保存账号到账号列表
      const accounts = utools.dbStorage.getItem("fishpi_accounts") || [];
      const existingAccountIndex = accounts.findIndex(
        (account) => account.userName === loginData.userName
      );

      if (existingAccountIndex === -1) {
        accounts.push({
          ...loginData,
          tokenName: loginData.saTokenInfo?.tokenName,
          tokenValue: loginData.saTokenInfo?.tokenValue,
        });
      } else {
        accounts[existingAccountIndex] = {
          ...loginData,
          tokenName: loginData.saTokenInfo?.tokenName,
          tokenValue: loginData.saTokenInfo?.tokenValue,
        };
      }
      utools.dbStorage.setItem("fishpi_accounts", accounts);

      utools.showNotification("登录成功");
      window.dispatchEvent(new CustomEvent("fishpi:login-success"));
    } else {
      utools.showNotification(res.message || "登录失败");
    }
  } catch (error) {
    if (error.message && error.message.includes("两步验证")) {
      // 处理两步验证的情况
      utools.showNotification(error.message);
    } else {
      utools.showNotification(error.message || "登录失败");
    }
  } finally {
    loading.value = false;
  }
};

// 跳转到注册页
const goToRegister = () => {
  utools.shellOpenExternal("https://yucoder.cn");
};

// 跳转到用户协议
const goToAgreement = () => {
  utools.shellOpenExternal("https://yucoder.cn/index");
};

// 跳转到隐私政策
const goToPrivacy = () => {
  utools.shellOpenExternal("https://yucoder.cn/index");
};
</script>

<style scoped>
.login-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* 左侧欢迎区域 */
.login-left {
  flex: 0 0 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

/* 应用图标 */
.app-icon-wrapper {
  margin-bottom: 24px;
}

.app-icon {
  width: 80px;
  height: 80px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: #fff;
  padding: 6px;
  object-fit: contain;
}

/* 登录表单容器 */
.login-form-container {
  width: 100%;
}

.form-bubble {
  background: #fff;
  border-radius: 24px;
  padding: 36px 32px 32px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  position: relative;
}

.form-item {
  margin-bottom: 16px;
}

/* 椭圆形输入框 */
.oval-input {
  width: 100%;
  padding: 12px 18px;
  border: 2px solid #e5e7eb;
  border-radius: 50px;
  font-size: 14px;
  background: #fff;
  color: #333;
  transition: all 0.3s ease;
  outline: none;
}

.oval-input::placeholder {
  color: #999;
}

.oval-input:focus {
  border-color: #666;
  box-shadow: 0 0 0 3px rgba(102, 102, 102, 0.1);
}

/* 注册链接区域 */
.register-wrapper {
  text-align: center;
  margin-top: 4px;
  margin-bottom: 16px;
  font-size: 13px;
}

.register-text {
  color: #666;
}

.register-link {
  background: none;
  border: none;
  padding: 0;
  color: #666;
  text-decoration: underline;
  cursor: pointer;
  font-size: 13px;
  margin-left: 4px;
  transition: color 0.3s ease;
}

.register-link:hover {
  color: #333;
}

/* 提交按钮 */
.submit-btn {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #666;
  border: 2px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  margin: 0 auto;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.submit-btn svg {
  width: 18px;
  height: 18px;
}

.submit-btn:hover:not(:disabled) {
  background: #555;
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.submit-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 协议区域 */
.agreement-wrapper {
  margin-top: 20px;
  text-align: center;
}

.agreement-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}

.agreement-checkbox {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #e5e7eb;
  cursor: pointer;
  appearance: none;
  position: relative;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.agreement-checkbox:checked {
  background: #10b981;
  border-color: #10b981;
}

.agreement-checkbox:checked::after {
  content: "✓";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  font-size: 10px;
  font-weight: bold;
}

.agreement-text {
  line-height: 1.5;
}

.agreement-link {
  background: none;
  border: none;
  padding: 0;
  color: #666;
  text-decoration: underline;
  cursor: pointer;
  font-size: inherit;
  transition: color 0.3s ease;
}

.agreement-link:hover {
  color: #333;
}

/* 右侧登录区域 */
.login-right {
  flex: 0 0 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.login-content {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.welcome-content {
  width: 100%;
  max-width: 600px;
}

.welcome-title {
  font-size: 32px;
  font-weight: 500;
  color: #333;
  margin: 0 0 32px 0;
  line-height: 1.4;
}

.welcome-text {
  font-size: 16px;
  color: #666;
  line-height: 1.8;
  margin: 0 0 24px 0;
}

.welcome-text:last-child {
  margin-bottom: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .login-container {
    flex-direction: column;
  }

  .login-left,
  .login-right {
    flex: 1;
    width: 100%;
  }

  .login-content,
  .welcome-content {
    max-width: 100%;
  }

  .welcome-title {
    font-size: 28px;
    margin-bottom: 24px;
  }

  .welcome-text {
    font-size: 15px;
    margin-bottom: 20px;
  }
}

@media (max-width: 480px) {
  .login-left,
  .login-right {
    padding: 24px;
  }

  .app-icon {
    width: 70px;
    height: 70px;
    border-radius: 14px;
  }

  .app-icon-wrapper {
    margin-bottom: 20px;
  }

  .form-bubble {
    padding: 28px 24px 24px;
    border-radius: 20px;
  }

  .form-item {
    margin-bottom: 14px;
  }

  .oval-input {
    padding: 11px 16px;
    font-size: 13px;
  }

  .submit-btn {
    width: 48px;
    height: 48px;
  }

  .submit-btn svg {
    width: 16px;
    height: 16px;
  }

  .agreement-label {
    font-size: 11px;
    gap: 5px;
  }

  .agreement-checkbox {
    width: 14px;
    height: 14px;
  }

  .register-wrapper {
    font-size: 12px;
    margin-bottom: 12px;
  }

  .agreement-wrapper {
    margin-top: 16px;
  }

  .welcome-title {
    font-size: 24px;
    margin-bottom: 20px;
  }

  .welcome-text {
    font-size: 14px;
    margin-bottom: 18px;
  }
}
</style>
