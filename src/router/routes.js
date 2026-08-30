import { ROUTES } from "@/constants/routes";
import { redirectPreserveQuery } from "@/utils/oauth";

const routes = [
  { path: "/", redirect: redirectPreserveQuery(ROUTES.mobileApproval) },
  { path: "/homepage", redirect: redirectPreserveQuery(ROUTES.mobileApproval) },
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/Login.vue"),
    meta: { title: "授权登录" },
  },
  {
    path: ROUTES.mobileApproval,
    name: "mobileApproval",
    component: () => import("@/views/Home.vue"),
    meta: { title: "流程一站通", ignoreAuth: true, keepAlive: true },
  },
  {
    path: ROUTES.index,
    name: "index",
    component: () => import("@/views/Home.vue"),
    meta: { title: "流程一站通", ignoreAuth: true, keepAlive: true },
  },
  {
    path: ROUTES.climbProcess,
    name: "climbProcess",
    component: () => import("@/views/ClimbList.vue"),
    meta: { title: "CLIMB流程", ignoreAuth: true, keepAlive: true },
  },
  {
    path: ROUTES.advancedFilter,
    name: "AdvancedFilter",
    component: () => import("@/views/AdvancedFilter.vue"),
    meta: { title: "高级筛选", ignoreAuth: true, keepAlive: true },
  },
  {
    path: ROUTES.nosupported,
    name: "Nosupported",
    component: () => import("@/views/NotSupported.vue"),
    meta: { title: "增设组合流程", ignoreAuth: true, keepAlive: true },
  },
  { path: "/climb", redirect: redirectPreserveQuery(ROUTES.climbProcess) },
  { path: "/filter", redirect: redirectPreserveQuery(ROUTES.advancedFilter) },
  {
    path: "/not-supported",
    redirect: redirectPreserveQuery(ROUTES.nosupported),
  },
  {
    path: "/workflow/processcenter/Nosupported",
    redirect: redirectPreserveQuery(ROUTES.nosupported),
  },
  {
    path: "/workflow/processcenter/AdvancedFilter",
    redirect: redirectPreserveQuery(ROUTES.advancedFilter),
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: redirectPreserveQuery(ROUTES.mobileApproval),
  },
];

export default routes;
