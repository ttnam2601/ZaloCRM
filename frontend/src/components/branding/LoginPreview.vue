<template>
  <!-- Preview trang /login trong Cài đặt › Hồ sơ tổ chức. Dựng lại y hệt login
       (banner dùng chung LoginBrandBanner + form tĩnh) rồi scale gọn để vừa khung.
       Không tương tác — chỉ để xem trước branding sẽ hiển thị thế nào. -->
  <div class="preview-viewport">
    <div class="preview-stage">
      <div class="login-card">
        <LoginBrandBanner
          :logo-url="logoUrl"
          :name="name"
          :slogan="slogan"
          :copyright="copyright"
        />
        <section class="login-form-wrap">
          <div class="form-inner">
            <h2 class="form-title">Đăng nhập</h2>
            <p class="form-sub">Chào mừng Anh/Chị quay lại hệ thống</p>
            <v-text-field
              :model-value="''"
              label="Email hoặc số điện thoại"
              variant="outlined"
              prepend-inner-icon="mdi-account-outline"
              :placeholder="emailPlaceholder"
              persistent-placeholder
              readonly
              hide-details
              class="mb-4"
            />
            <v-text-field
              :model-value="''"
              label="Mật khẩu"
              type="password"
              variant="outlined"
              prepend-inner-icon="mdi-lock-outline"
              placeholder="Nhập mật khẩu"
              persistent-placeholder
              readonly
              hide-details
              class="mb-5"
            />
            <v-btn color="primary" block size="large" rounded="lg">
              <v-icon start>mdi-login</v-icon>
              Đăng nhập
            </v-btn>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import LoginBrandBanner from './LoginBrandBanner.vue';

defineProps<{
  logoUrl?: string | null;
  name: string;
  slogan?: string | null;
  copyright?: string | null;
  emailPlaceholder: string;
}>();
</script>

<style scoped>
/* Viewport giữ tỉ lệ 880×460 của login card; stage scale 0.6 cho vừa cột phải. */
.preview-viewport {
  width: 528px;          /* 880 × 0.6 */
  max-width: 100%;
  height: 276px;         /* 460 × 0.6 */
  overflow: hidden;
  border-radius: 14px;
}
.preview-stage {
  width: 880px;
  height: 460px;
  transform: scale(0.6);
  transform-origin: top left;
  pointer-events: none;  /* preview tĩnh, không click được */
}

.login-card {
  display: flex;
  width: 880px;
  height: 460px;
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 24px 60px -12px rgba(6, 34, 47, 0.28), 0 8px 24px -8px rgba(6, 34, 47, 0.18);
}
.login-form-wrap {
  flex: 1 1 58%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 44px 40px;
}
.form-inner { width: 100%; max-width: 340px; }
.form-title { font-size: 24px; font-weight: 700; color: #0e445a; margin: 0 0 4px; }
.form-sub { font-size: 13.5px; color: #6b7884; margin: 0 0 26px; }
</style>
