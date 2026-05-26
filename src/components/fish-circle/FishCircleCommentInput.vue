<template>
  <div v-if="visible" class="comment-input-area" :class="{ 'comment-input-inline': inline }">
    <div v-if="replyHint" class="reply-hint">
      回复 {{ replyHint }}
      <i class="fas fa-times" @click="$emit('clear-reply')" />
    </div>
    <div v-if="images.length" class="comment-img-preview">
      <div v-for="(u, ix) in images" :key="ix" class="cimg-item">
        <img :src="u" alt="" />
        <span class="rm" @click="$emit('remove-image', ix)"><i class="fas fa-times" /></span>
      </div>
    </div>
    <div class="comment-input-row">
      <el-input
        :model-value="text"
        :placeholder="replyHint ? `回复 ${replyHint}...` : '写评论...'"
        maxlength="200"
        @update:model-value="$emit('update:text', $event)"
        @keyup.enter="$emit('submit')"
        @paste="(e) => $emit('paste', e)"
      />
      <label class="img-add">
        <input
          type="file"
          accept="image/*"
          :disabled="images.length >= 3 || imageUploading"
          @change="(e) => $emit('file', e)"
        />
        <i class="fas fa-image" />
      </label>
      <el-button
        type="primary"
        size="small"
        :loading="submitting"
        :disabled="!text.trim() && !images.length"
        @click="$emit('submit')"
      >
        发送
      </el-button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  inline: { type: Boolean, default: true },
  text: { type: String, default: "" },
  replyHint: { type: String, default: "" },
  images: { type: Array, default: () => [] },
  imageUploading: { type: Boolean, default: false },
  submitting: { type: Boolean, default: false },
});

defineEmits([
  "update:text",
  "submit",
  "clear-reply",
  "remove-image",
  "paste",
  "file",
]);
</script>

<style scoped>
.comment-input-area {
  margin-top: 8px;
}

.comment-input-area.comment-input-inline {
  margin-left: 36px;
  margin-bottom: 6px;
}

.reply-hint {
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
}

.reply-hint .fa-times {
  cursor: pointer;
  margin-left: 8px;
}

.comment-img-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.cimg-item {
  position: relative;
  width: 56px;
  height: 56px;
}

.cimg-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
}

.cimg-item .rm {
  position: absolute;
  top: -6px;
  right: -6px;
  cursor: pointer;
  background: #333;
  color: #fff;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}

.comment-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.comment-input-row :deep(.el-input) {
  flex: 1;
}

.img-add {
  cursor: pointer;
  color: #888;
  font-size: 18px;
  position: relative;
}

.img-add input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
</style>
