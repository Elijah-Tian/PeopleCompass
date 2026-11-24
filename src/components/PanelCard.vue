<template>
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
