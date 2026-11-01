// The security brief use case, free of any web framework: the app wires these into its own
// routes, scheduler and dependency injection. HTTP shapes are in "./api".
export { BRIEF_MODEL, createBriefModel } from "./brief/model";
export {
  type Backend,
  BriefRunError,
  GROUPS_PER_REQUEST,
  type ModelApi,
  type RunResult,
  runBrief,
} from "./brief/run";
export { type ExistingItem, type ItemWrite, type StoredEntry, storedEntry } from "./brief/group";
export { checkSecurityBriefEnv, type SecurityBriefEnv, securityBriefEnvSchema } from "./env";
export {
  type CollectedEntry,
  collectFeeds,
  type FeedCollection,
  type FeedCursors,
  type FeedFailure,
  type FetchLike,
} from "./feeds/feeds";
export {
  type RunLogger,
  type RunnerDeps,
  type RunOutcome,
  SecurityBriefRunner,
  type StartResult,
} from "./runner";
export { isDue, RUN_HOUR_UTC, runDate } from "./schedule";
export { type BriefStore, PrismaBriefStore, type RunRecord } from "./store/briefs";
export { PrismaSourcesStore, type SourcesStore } from "./store/sources";
