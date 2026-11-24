<template>
  <!-- 通用卡片容器。logo、title、actions 和默认 slots 组成标题与内容。 -->
  <section class="panel-card card">
    <header v-if="$slots.logo || $slots.title || $slots.actions" class="panel-card__header">
      <div class="panel-card__heading">
        <span v-if="$slots.logo" class="panel-card__logo"><slot name="logo" /></span>
        <div v-if="$slots.title" class="panel-card__title"><slot name="title" /></div>
      </div>
      <div v-if="$slots.actions" class="panel-card__actions"><slot name="actions" /></div>
    </header>
    <div class="panel-card__content"><slot /></div>
  </section>
</template>

<style scoped>
.panel-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 15px;
}

.panel-card__heading {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.panel-card__logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.panel-card__title {
  font-size: 14px;
  line-height: 1.3;
}

.panel-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-card__content {
  min-width: 0;
}
</style>
