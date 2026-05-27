<template>
  <div class="farm-pet-nest-wrap farm-pet-nest-wrap--cottage">
    <el-tooltip :content="tooltipTitle" placement="left">
      <button type="button" class="farm-pet-nest farm-pet-nest--cottage" @click="goPetCenter">
        <span class="farm-pet-nest-figure">
          <el-icon v-if="loading" class="is-loading"><Loading /></el-icon>
          <span v-else-if="pet?.petUrl" class="farm-pet-nest-pet">
            <PetSprite
              v-if="isWebpSprite(pet.petUrl)"
              :sprite-url="pet.petUrl"
              :frame-width="192"
              :frame-height="208"
              :total-cols="8"
              :total-rows="9"
              :actions="DEFAULT_SPRITE_ACTIONS"
              :scale="FARM_PET_SPRITE_SCALE"
              :auto-play="true"
              :auto-play-min-interval="3000"
              :auto-play-max-interval="8000"
              class-name="farm-pet-nest-img farm-pet-nest-sprite"
            />
            <img
              v-else
              :src="pet.petUrl"
              class="farm-pet-nest-img"
              alt=""
              draggable="false"
            />
          </span>
          <span v-else class="farm-pet-nest-empty" aria-hidden>🐾</span>
        </span>
        <span class="farm-pet-nest-label">
          <template v-if="pet">
            <span class="farm-pet-nest-name">{{ pet.name ?? "宠物" }}</span>
            <span class="farm-pet-nest-level">Lv.{{ pet.level ?? 1 }}</span>
          </template>
          <span v-else class="farm-pet-nest-hint">去领养</span>
        </span>
      </button>
    </el-tooltip>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Loading } from "@element-plus/icons-vue";
import PetSprite from "../PetSprite.vue";
import { userApi } from "../../api/user";
import { useUserStore } from "../../stores/user";
import { isWebpSprite, DEFAULT_SPRITE_ACTIONS } from "../../utils/petRender";
import "../../styles/farm/pet-nest.less";

/** 农舍门口展示尺寸（略小于 frontend 的 120px） */
const FARM_PET_SPRITE_SCALE = 96 / 192;

const router = useRouter();
const userStore = useUserStore();
const pet = ref(null);
const loading = ref(true);

const tooltipTitle = computed(() =>
  pet.value
    ? `${pet.value.name ?? "宠物"} Lv.${pet.value.level ?? 1} · 点击查看`
    : "屋里空空 · 点击领养宠物",
);

async function loadPet() {
  if (!userStore.userInfo) {
    pet.value = null;
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const res = await userApi.getPetDetail();
    pet.value = res?.code === 0 ? res.data : null;
  } catch {
    pet.value = null;
  } finally {
    loading.value = false;
  }
}

function goPetCenter() {
  router.push("/pet-center");
}

onMounted(loadPet);
</script>
