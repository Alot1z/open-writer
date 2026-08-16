/**
 * Domain entity types for the local-first Open Writer data layer.
 *
 * These mirror the previous Prisma/SQLite models exactly, except that
 * DateTime fields are stored as ISO-8601 strings (which is what the old
 * API returned to the client after JSON serialization).
 */

export interface Project {
  id: string
  name: string
  description: string
  genre: string
  synopsis: string
  status: string
  coverImage: string
  settings: string
  createdAt: string
  updatedAt: string
}

export interface Chapter {
  id: string
  projectId: string
  title: string
  synopsis: string
  order: number
  status: string
  notes: string
  metadata: string
  createdAt: string
  updatedAt: string
}

export interface Scene {
  id: string
  chapterId: string
  title: string
  content: string
  order: number
  status: string
  povCharacterId: string
  locationId: string
  timeOfDay: string
  notes: string
  wordCount: number
  metadata: string
  createdAt: string
  updatedAt: string
}

export interface Character {
  id: string
  projectId: string
  name: string
  description: string
  role: string
  age: string
  occupation: string
  personality: string
  appearance: string
  backstory: string
  motivation: string
  goals: string
  fears: string
  /** What the character knows: secrets, plans, information held. */
  knowledge: string
  /** Where/when the character appears: scenes, chapters, settings. */
  appearances: string
  tags: string
  metadata: string
  createdAt: string
  updatedAt: string
}

export interface Location {
  id: string
  projectId: string
  name: string
  description: string
  type: string
  atmosphere: string
  history: string
  features: string
  /** Who owns/controls the location (character or faction name). */
  ownership: string
  parentLocationId: string
  tags: string
  metadata: string
  createdAt: string
  updatedAt: string
}

export interface StoryObject {
  id: string
  projectId: string
  name: string
  description: string
  type: string
  owner: string
  location: string
  history: string
  appearance: string
  significance: string
  tags: string
  metadata: string
  createdAt: string
  updatedAt: string
}

export interface WorldElement {
  id: string
  projectId: string
  name: string
  description: string
  category: string
  parent: string
  rules: string
  history: string
  tags: string
  metadata: string
  createdAt: string
  updatedAt: string
}

export interface TimelineEvent {
  id: string
  projectId: string
  title: string
  description: string
  date: string
  time: string
  duration: string
  location: string
  characters: string
  objects: string
  sourceScene: string
  cause: string
  consequence: string
  eventType: string
  tags: string
  metadata: string
  createdAt: string
  updatedAt: string
}

export interface Relationship {
  id: string
  projectId: string
  sourceId: string
  sourceType: string
  targetId: string
  targetType: string
  type: string
  description: string
  strength: number
  tags: string
  metadata: string
  createdAt: string
  updatedAt: string
}

export interface Note {
  id: string
  projectId: string
  title: string
  content: string
  category: string
  linkedType: string
  linkedId: string
  priority: number
  resolved: boolean
  tags: string
  metadata: string
  createdAt: string
  updatedAt: string
}

export interface Comment {
  id: string
  projectId: string
  sceneId: string | null
  content: string
  resolved: boolean
  position: string
  linkedType: string
  linkedId: string
  metadata: string
  createdAt: string
  updatedAt: string
}

export interface ManuscriptVersion {
  id: string
  projectId: string
  sceneId: string | null
  content: string
  wordCount: number
  label: string
  isMilestone: boolean
  isAutosave: boolean
  snapshot: string
  createdAt: string
}

export interface WritingGoal {
  id: string
  projectId: string
  type: string
  target: number
  current: number
  deadline: string
  active: boolean
  metadata: string
  createdAt: string
  updatedAt: string
}

export interface WritingSession {
  id: string
  projectId: string
  wordsWritten: number
  duration: number
  date: string
  metadata: string
  createdAt: string
}

export interface AgentTask {
  id: string
  projectId: string
  goal: string
  status: string
  plan: string
  currentStep: number
  permission: string
  toolCalls: string
  observations: string
  errors: string
  artifacts: string
  result: string
  metadata: string
  createdAt: string
  updatedAt: string
}
