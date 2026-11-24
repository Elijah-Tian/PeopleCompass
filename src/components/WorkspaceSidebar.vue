<template>
  <!-- PeopleCompass 工作台侧边导航，展示当前页面和规划中的模块。 -->
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-mark"><span></span><span></span><span></span></div>
      <div><strong>PeopleCompass</strong></div>
    </div>
    <div class="nav-caption">工作台</div>
    <nav class="main-nav" aria-label="主导航">
      <a class="nav-item" href="#" @click.prevent><span class="nav-icon">⌂</span>数据总览</a>
      <a class="nav-item" href="#" @click.prevent><span class="nav-icon">♙</span>人员分析</a>
      <a class="nav-item active" href="#" aria-current="page" @click.prevent>
        <span class="nav-icon">⇄</span>月度人员异动</a>
      <a class="nav-item disabled" href="#" @click.prevent><span class="nav-icon">▦</span>组织分析 <em>规划中</em></a>
      <a class="nav-item disabled" href="#" @click.prevent><span class="nav-icon">⌕</span>招聘分析 <em>规划中</em></a>
      <a class="nav-item disabled" href="#" @click.prevent><span class="nav-icon">↘</span>离职分析 <em>规划中</em></a>
    </nav>
    <!-- <div class="sidebar-footer">
      <div class="footer-avatar">HR</div>
      <div class="footer-profile"><strong>人力资源部</strong><small>数据分析工作区</small></div>
      <span class="footer-dots">•••</span>
    </div> -->
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  background: #fff;
  border-right: 1px solid #edf0f5;
  display: flex;
  flex-direction: column;
  z-index: 4;
  padding: 30px 19px 18px;
  width: var(--sidebar-width);
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 2px 11px 45px;
}

.brand-mark {
  background: #eff4ff;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 39px;
  height: 39px;
  border-radius: 12px;
  padding: 10px;
  gap: 4px;
}

.brand-mark span {
  display: block;
  border-radius: 3px;
  background: #3e76f4;
  width: 5px;
}

.brand-mark span:nth-child(1) {
  height: 12px;
}

.brand-mark span:nth-child(2) {
  height: 18px;
}

.brand-mark span:nth-child(3) {
  height: 10px;
}

.brand strong {
  display: block;
  letter-spacing: -.35px;
  font-size: 16px;
}

.brand small {
  display: block;
  color: #9aa4b2;
  font-size: 12px;
  margin-top: 4px;
}

.nav-caption {
  color: #a2aaba;
  letter-spacing: .08em;
  font-size: 12px;
  padding: 0 13px 13px;
}

.main-nav {
  display: grid;
  gap: 7px;
}

.nav-item {
  display: flex;
  align-items: center;
  color: #738097;
  text-decoration: none;
  transition: .16s;
  height: 52px;
  padding: 0 13px;
  gap: 14px;
  border-radius: 9px;
  font-size: 14px;
}

.nav-item:hover {
  background: #f7f9fc;
  color: #42516a;
}

.nav-item.active {
  background: #eef3ff;
  color: #3269ed;
  font-weight: 600;
}

.nav-icon {
  text-align: center;
  color: #9ba6b5;
  width: 20px;
  font-size: 21px;
}

.nav-item.active .nav-icon {
  color: #356df3;
}

.nav-item.disabled {
  color: #a8b0bd;
}

.nav-item em {
  font-style: normal;
  margin-left: auto;
  color: #acb4c1;
  font-size: 10px;
}

.sidebar-footer {
  margin-top: auto;
  border-top: 1px solid #eff1f5;
  display: flex;
  align-items: center;
  padding: 17px 4px 0;
  gap: 11px;
}

.footer-avatar {
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #eaf0ff;
  color: #4e75cd;
  font-weight: 700;
  width: 38px;
  height: 38px;
  font-size: 12px;
}

.footer-profile {
  display: grid;
  gap: 2px;
  flex: 1;
}

.footer-profile strong {
  font-weight: 600;
  font-size: 12px;
}

.footer-profile small {
  color: #9da7b5;
  font-size: 11px;
}

.footer-dots {
  font-size: 13px;
  color: #a1aab8;
  letter-spacing: 2px;
}

@media (max-width: 1050px) {
  .sidebar {
    padding: 24px 14px 16px;
  }
}

@media (max-width: 760px) {
  .sidebar {
    padding: 18px 8px;
  }

  .brand {
    padding: 1px 3px 30px;
  }

  .nav-item {
    justify-content: center;
    font-size: 0;
  }

  .nav-item.active .nav-icon {
    font-size: 18px;
  }

  .sidebar-footer {
    justify-content: center;
  }

  .footer-profile,
  .footer-dots,
  .brand > div:nth-child(2) {
    display: none;
  }
}
</style>
