export { db } from "./client"
export type { Database } from "./client"
export * from "./schema/index"
export { StorageBucket, BucketMaxSize, buildStoragePath, getSignedUrl, deleteFile } from "./storage"
export type { StorageBucket as StorageBucketType } from "./storage"
export { queryCompanyKpis } from "./queries/kpis"
export type { CompanyKpis } from "./queries/kpis"
export { queryGroupKpis } from "./queries/group-kpis"
export type { GroupKpis } from "./queries/group-kpis"
export {
  queryManagerKpis,
  queryManagerSnapshot,
  queryWorkerContext,
  querySpecialistContext,
} from "./queries/dashboard"
export type {
  ManagerKpis,
  ManagerSnapshot,
  WorkerContext,
  SpecialistContext,
} from "./queries/dashboard"
export {
  queryShopOrderSummary,
  queryTopProducts,
  queryReviewStats,
  queryLowStockProducts,
} from "./queries/shop"
export type { ShopOrderSummary, TopProduct, ReviewStats, LowStockProduct } from "./queries/shop"
export {
  queryNotifications,
  queryNotificationCounts,
  markNotificationsRead,
  markAllNotificationsRead,
  dismissNotification,
  dismissAllNotifications,
  executeNotificationAction,
} from "./queries/notifications"
export type {
  NotificationFilter,
  NotificationActionKind,
  NotificationRow,
  NotificationCounts,
} from "./queries/notifications"
