import "./main.css";
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import "./style.css";
import "@fortawesome/fontawesome-free/css/all.css";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
// 导入主题管理
import "./utils/theme.js";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(ElementPlus);
app.mount("#app");

if (typeof utools !== "undefined") {
  utools.onPluginEnter(() => {
    const userSettings = utools.dbStorage.getItem("fishpi_settings") || {};
    const currentUsername = utools.dbStorage.getItem("fishpi_user_info")?.userName;
    const settings = currentUsername ? userSettings[currentUsername] || {} : userSettings;
    
    if (settings.detachWindowSearchBar) {
      utools.setSubInput(({ text }) => {
        console.log("搜索内容:", text);
      }, "", false);
    }
  });
}
