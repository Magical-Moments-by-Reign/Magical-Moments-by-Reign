// ── Life Estate framework — shared types ────────────────────────
// One framework, many estates. An Estate is defined by CONFIGURATION (data +
// content), not bespoke code — see docs/LIFE-ESTATE-FRAMEWORK.md. These types
// are pure (no I/O) so they can be unit-tested and reused on server and client.

/** The twelve universal Estate modules (framework §7). */
export type ModuleKey =
  | "overview"
  | "learn"
  | "plan"
  | "tasks"
  | "documents"
  | "tools"
  | "professionals"
  | "progress"
  | "milestones"
  | "memories"
  | "settings";

/**
 * Honest status of a module for a given Estate. "live" means it is genuinely
 * usable now; "soon" means it is an elegant, honest placeholder (never faked).
 */
export type ModuleStatus = "live" | "soon";

export interface EstateModule {
  key: ModuleKey;
  label: string;
  description: string;
  status: ModuleStatus;
  icon: string;
}

/** A goal the member may be pursuing within the Estate (Goal Discovery). */
export interface EstateGoal {
  id: string;
  label: string;
  description: string;
  /** Grouping label for display (e.g. "Buying", "Investing"). */
  group: string;
}

/** A stage on the journey (Stage Assessment). Ordered, first = default. */
export interface EstateStage {
  id: string;
  label: string;
}

/** A learning topic surfaced in the Learning Center (content authored later). */
export interface LearningTopic {
  id: string;
  title: string;
  summary: string;
}

/** A meaningful milestone within the Estate. */
export interface EstateMilestone {
  id: string;
  name: string;
  meaning: string;
}

/** A vetted-professional category the Estate may connect (via the marketplace). */
export interface ProfessionalCategory {
  id: string;
  label: string;
}

/** A natural onward Estate the member may flow into (cross-Estate continuity). */
export interface CrossEstateLink {
  estate: string;
  reason: string;
}

/**
 * A lobby destination — the elegant "front doors" a member sees on arrival at
 * an Estate (not the granular data goals). Each is a refined button with a
 * champagne line-icon; `icon` names an SVG in the EstateIcon set.
 */
export interface Destination {
  id: string;
  title: string;
  /** A short, warm sub-line (e.g. "Begin your journey"). */
  tagline: string;
  /** Named icon in the champagne-gold line-icon set. */
  icon: string;
}

/**
 * The full configuration for one Life Estate. Everything here is data/content;
 * the shared framework renders it. Adding an Estate is authoring one of these,
 * not building a new application.
 */
export interface EstateConfig {
  key: string; // internal key, e.g. "home"
  name: string; // customer-facing nav label, e.g. "Home"
  icon: string; // emoji, e.g. "🏡"
  tagline: string;
  /** Short line introducing the Estate, under its "🏡 Home" heading. */
  intro: string;
  /** Supporting description of how this Estate helps (advisor voice). */
  welcomeBody: string;
  /** True for emotionally sensitive estates (restrained tone; no celebration flourish). */
  sensitive?: boolean;
  /** The elegant lobby "front doors" shown on arrival at the Estate. */
  destinations: Destination[];
  goals: EstateGoal[];
  stages: EstateStage[];
  modules: EstateModule[];
  milestones: EstateMilestone[];
  professionalCategories: ProfessionalCategory[];
  learningTopics: LearningTopic[];
  crossEstate: CrossEstateLink[];
}

/** Find a module by key within an estate (pure helper). */
export function moduleOf(config: EstateConfig, key: ModuleKey): EstateModule | undefined {
  return config.modules.find((m) => m.key === key);
}

/** The live modules for an estate, in config order (pure helper). */
export function liveModules(config: EstateConfig): EstateModule[] {
  return config.modules.filter((m) => m.status === "live");
}
