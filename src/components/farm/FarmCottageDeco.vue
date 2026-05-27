<template>
  <div class="farm-cottage-deco-wrap">
    <div class="farm-cottage-stage">
      <img class="farm-cottage-img" :src="cottageImg" alt="农舍" />
      <FarmPetNest v-if="showPet" />
    </div>
  </div>
</template>

<script setup>
import FarmPetNest from "./FarmPetNest.vue";
import "../../styles/farm/cottage-deco.less";

defineProps({
  showPet: { type: Boolean, default: true },
});

const cottageImg = "https://oss.cqbo.com/moyu/farm/xiaowu.png";
</script>
