import { createRouter, createWebHistory } from "vue-router";
import App from "./App.vue";
import LearnMore from "./pages/LearnMore.vue";

export const router = createRouter({
  history: createWebHistory("/chat/"),
  routes: [
    {
      path: "/",
      component: App,
    },
    {
      path: "/learn-more",
      component: LearnMore,
    },
  ],
});
