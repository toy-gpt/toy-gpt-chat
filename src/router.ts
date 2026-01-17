// src/router.ts
import { createRouter, createWebHistory } from "vue-router";
import Home from "./pages/Home.vue";
import LearnMore from "./pages/LearnMore.vue";

export const router = createRouter({
  history: createWebHistory("/chat/"),
  routes: [
    { path: "/", component: Home },
    { path: "/learn-more", component: LearnMore },
  ],
});
