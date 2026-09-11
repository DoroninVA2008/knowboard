// src/state.ts
// Типы данных и вся работа с localStorage.
// Схема JSON берётся из mock/data.json, ключи — из ТЗ (раздел 02, «Сохранение состояния»).

import rawData from './mock/data.json'

/* ======================= ТИПЫ ======================= */

export type Theme = 'light' | 'dark'

// Цвета категорий приходят из data.json полем color.
// Допустимые значения — те, что есть в ТЗ (раздел 04, «Палитра»).
export type ColorKey = 'accent' | 'info' | 'pink' | 'violet' | 'ok' | 'warn'

export interface Category {
  id: string
  name: string
  description: string
  icon: string
  color: ColorKey
}

export interface Lesson {
  id: string
  title: string
  minutes: number
  free: boolean
}

export interface Course {
  id: string
  title: string
  categoryId: string
  teacher: string
  level: 'beginner' | 'middle' | 'advanced'
  description: string
  hours: number
  rating: number
  reviews: number
  price: number
  oldPrice?: number
  seatsLeft: number
  updatedAt: string
  tags: string[]
  lessons: Lesson[]
  lessonsTotal: number
  enrolled: boolean
  lessonsDone: number
  averageScore: number
  // Поля color в data.json у курса нет — цвет берём из категории.
  // Оставляем его опциональным, чтобы не переписывать data.json.
  color?: ColorKey
}

export type TaskStatus = 'not_started' | 'in_progress' | 'submitted' | 'graded'
export type TaskPriority = 'high' | 'medium' | 'low'
export type TaskKind = 'assignment' | 'quiz' | 'project' | 'lab'

export interface Task {
  id: string
  courseId: string
  title: string
  kind: TaskKind
  dueDate: string
  status: TaskStatus
  priority: TaskPriority
  submittedAt?: string
  score?: number
  feedback?: string
  teacher: string
}

export type ResourceKind = 'pdf' | 'video' | 'link' | 'code' | 'dataset'

export interface Resource {
  id: string
  courseId: string
  title: string
  kind: ResourceKind
  sizeKb?: number
  addedAt: string
  author: string
}

export interface WeeklyActivity {
  label: string
  hours: number
  color: ColorKey
}

export interface User {
  id: string
  name: string
  email: string
  role: string
  initials: string
  plan: 'free' | 'pro'
  trialDaysLeft: number
  streakDays: number
}

export interface Settings {
  theme: Theme
  emailDigest: boolean
  deadlineReminders: boolean
  language: string
}

export interface AppData {
  version: number
  user: User
  categories: Category[]
  courses: Course[]
  tasks: Task[]
  resources: Resource[]
  weeklyActivity: WeeklyActivity[]
  settings: Settings
}

/* ======================= STORAGE ======================= */

// Ключ localStorage — по ТЗ (раздел 02, «Сохранение состояния»).
// Значение может быть любым, лишь бы оно не конфликтовало с другими приложениями
// на том же домене.
export const STORAGE_KEY = 'knowvio.student-cabinet.v1'

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const emptyData = (): AppData => clone(rawData as unknown as AppData)

export const loadState = (): AppData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyData()
    const parsed = JSON.parse(raw) as AppData
    // Простейшая валидация: если в объекте нет нужных полей — откатываемся к исходнику.
    if (!parsed || !Array.isArray(parsed.courses) || !parsed.user) return emptyData()
    return parsed
  } catch {
    return emptyData()
  }
}

export const saveState = (data: AppData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Если localStorage переполнен или запрещён — молча игнорируем.
    // По ТЗ это допустимо: главное, чтобы приложение не падало.
  }
}

export const resetState = (): AppData => {
  localStorage.removeItem(STORAGE_KEY)
  return emptyData()
}

/* ======================= СЕЛЕКТОРЫ ======================= */
// Функции ниже — «чистые»: получают данные и возвращают производные.
// Это позволяет не дублировать логику между страницами.

export const getCourse = (data: AppData, id: string) =>
  data.courses.find((c) => c.id === id)

export const getCategory = (data: AppData, id: string) =>
  data.categories.find((c) => c.id === id)

export const getCourseTitle = (data: AppData, id: string) =>
  getCourse(data, id)?.title ?? 'Курс удалён'

export const getEnrolledCourses = (data: AppData) =>
  data.courses.filter((c) => c.enrolled)

export const getCoursesByCategory = (data: AppData, categoryId: string) =>
  data.courses.filter((c) => c.categoryId === categoryId)

export const getCourseResources = (data: AppData, courseId: string) =>
  data.resources.filter((r) => r.courseId === courseId)

export const isOpenTask = (t: Task) =>
  t.status === 'not_started' || t.status === 'in_progress'

// ТЗ, раздел 02, «Задания»: «Незакрытые задания по возрастанию срока».
export const getOpenTasks = (data: AppData) =>
  data.tasks.filter(isOpenTask).sort((a, b) => a.dueDate.localeCompare(b.dueDate))

// ТЗ, раздел 02, «Задания»: вкладки «отправленные» и «проверенные».
export const getSubmittedTasks = (data: AppData) =>
  data.tasks
    .filter((t) => t.status === 'submitted')
    .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))

export const getGradedTasks = (data: AppData) =>
  data.tasks
    .filter((t) => t.status === 'graded')
    .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))

/* ======================= СВОДКА ======================= */
// ТЗ, раздел 02, «Обзор» → «Сводка»: «Минимум четыре показателя,
// посчитанные из данных... Руками не проставлять».

export interface Summary {
  coursesInProgress: number
  lessonsDone: number
  lessonsTotal: number
  averageScore: number
  hoursPerWeek: number
}

export const getSummary = (data: AppData): Summary => {
  const enrolled = getEnrolledCourses(data)
  const lessonsDone = enrolled.reduce((s, c) => s + c.lessonsDone, 0)
  const lessonsTotal = enrolled.reduce((s, c) => s + c.lessonsTotal, 0)

  // ТЗ, раздел 02, «Обзор» → «Сводка»: «средний балл по проверенным заданиям».
  // Считаем именно по заданиям со статусом graded и непустым score,
  // а не по averageScore курсов — это разные вещи.
  const graded = data.tasks.filter((t) => t.status === 'graded' && typeof t.score === 'number')
  const averageScore = graded.length
    ? Math.round(graded.reduce((s, t) => s + (t.score ?? 0), 0) / graded.length)
    : 0

  // ТЗ, раздел 02, «Обзор» → «Сводка»: «часы за неделю».
  const hoursPerWeek = Number(
    data.weeklyActivity.reduce((s, i) => s + i.hours, 0).toFixed(1),
  )

  return {
    coursesInProgress: enrolled.length,
    lessonsDone,
    lessonsTotal,
    averageScore,
    hoursPerWeek,
  }
}

/* ======================= ФОРМАТ ======================= */

const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

export const formatDate = (iso: string) => {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]}`
}

export const formatMonthRu = (iso: string) => {
  const MONTHS_NOM = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ]
  const [y, m] = iso.split('-').map(Number)
  return `${MONTHS_NOM[m - 1]} ${y}`
}

// Склонение: 1 курс / 2 курса / 5 курсов.
export const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return `${n} ${one}`
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} ${few}`
  return `${n} ${many}`
}

// Размер файла в читаемом виде: 15400 КБ → 15 МБ.
// ТЗ, раздел 03, «Крупный файл»: «Показывать в мегабайтах, а не пятизначным числом килобайт».
export const formatSize = (kb?: number) => {
  if (!kb) return ''
  if (kb < 1024) return `${kb} КБ`
  const mb = kb / 1024
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} МБ`
}

export const initialsFromName = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

/* ======================= СПРАВОЧНИКИ ДЛЯ UI ======================= */

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: 'Не начато',
  in_progress: 'В работе',
  submitted: 'На проверке',
  graded: 'Проверено',
}

export const TASK_STATUS_COLOR: Record<TaskStatus, ColorKey> = {
  not_started: 'info',
  in_progress: 'ok',
  submitted: 'violet',
  graded: 'accent',
}

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
}

export const TASK_PRIORITY_COLOR: Record<TaskPriority, ColorKey> = {
  high: 'accent',
  medium: 'warn',
  low: 'info',
}

export const TASK_KIND_LABEL: Record<TaskKind, string> = {
  assignment: 'Задание',
  quiz: 'Тест',
  project: 'Проект',
  lab: 'Лабораторная',
}

export const LEVEL_LABEL: Record<Course['level'], string> = {
  beginner: 'Начальный',
  middle: 'Средний',
  advanced: 'Продвинутый',
}

export const RESOURCE_KIND_LABEL: Record<ResourceKind, string> = {
  pdf: 'Документ',
  video: 'Видео',
  link: 'Ссылка',
  code: 'Код',
  dataset: 'Датасет',
}

export const RESOURCE_KIND_COLOR: Record<ResourceKind, ColorKey> = {
  pdf: 'accent',
  video: 'pink',
  link: 'info',
  code: 'violet',
  dataset: 'ok',
}

// CSS-переменные из ТЗ, раздел 04. Используем их напрямую, чтобы не хардкодить hex.
export const cssColor = (key: ColorKey) => `var(--${key})`
export const cssSoft = (key: ColorKey) => `var(--${key}-soft)`

export const MAX_LENGTHS = {
  name: 60,
  email: 120,
  role: 80,
} as const

// ТЗ, раздел 03, «Рейтинг 5 и 4.05»: «Единый формат, один знак после запятой».
export const formatRating = (value: number) => value.toFixed(1)

// ТЗ, раздел 03, «Цена 0»: «Показывать "Бесплатно" вместо суммы».
export const formatPrice = (value: number) =>
  value === 0 ? 'Бесплатно' : `${value.toLocaleString('ru-RU')} ₽`

// ТЗ, раздел 03, «Крупный файл» и «oldPrice есть не везде» — эти проверки в компоненте.