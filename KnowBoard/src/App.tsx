// src/App.tsx
// Всё приложение: состояние, роутер, страницы, компоненты.
// Единственный .tsx файл в проекте (плюс main.tsx).

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  BrowserRouter,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {// @ts-ignore
  Award,
  Bell,
  BookOpen,// @ts-ignore
  Braces,// @ts-ignore
  CalendarClock,
  Check,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Code2,
  Compass,
  Crown,
  Database,
  ExternalLink,
  FileText,
  FolderOpen,
  GraduationCap,
  Home,
  Info,// @ts-ignore
  LineChart as LineChartIcon,
  Link as LinkIcon,
  LogOut,
  Menu,
  Moon,
  Palette,// @ts-ignore
  PieChart as PieChartIcon,
  PlayCircle,
  Plus,
  RotateCcw,
  Save,
  Search,
  SearchX,
  Send,
  Settings as SettingsIcon,
  Shapes,
  Sun,
  Target,
  User as UserIcon,// @ts-ignore
  Users,// @ts-ignore
  Star,// @ts-ignore
  AlertTriangle,
} from 'lucide-react'
import './App.scss'
import {
  cssColor,
  cssSoft,
  formatDate,
  formatMonthRu,
  formatSize,
  getCategory,
  getCourse,
  getCourseResources,
  getCourseTitle,
  getCoursesByCategory,// @ts-ignore
  getEnrolledCourses,
  getGradedTasks,
  getOpenTasks,
  getSubmittedTasks,
  getSummary,
  initialsFromName,
  LEVEL_LABEL,
  loadState,
  MAX_LENGTHS,
  plural,
  RESOURCE_KIND_COLOR,
  RESOURCE_KIND_LABEL,
  resetState,
  saveState,
  STORAGE_KEY,
  TASK_KIND_LABEL,
  TASK_PRIORITY_COLOR,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_COLOR,
  TASK_STATUS_LABEL,
  type AppData,
  type ColorKey,
  type Course,
  type Resource,
  type Task,
  type Theme,
  formatPrice,
  formatRating,
} from './types'

/* ============================================================
   СОСТОЯНИЕ
   ============================================================ */

// Действия редьюсера. Каждое — одно осмысленное изменение данных.
// ТЗ, раздел 02, «Сохранение состояния»: всё, что здесь перечислено,
// должно переживать F5.
type Action =
  | { type: 'toggle-theme' }
  | { type: 'set-theme'; theme: Theme }
  | { type: 'toggle-course-enroll'; courseId: string }
  | { type: 'complete-next-lesson'; courseId: string }
  | { type: 'start-task'; taskId: string }
  | { type: 'submit-task'; taskId: string }
  | { type: 'update-profile'; name?: string; email?: string; role?: string }
  | { type: 'toggle-email-digest' }
  | { type: 'toggle-deadline-reminders' }
  | { type: 'upgrade-plan' }
  | { type: 'reset'; data: AppData }

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'toggle-theme':
      return {
        ...state,
        settings: {
          ...state.settings,
          theme: state.settings.theme === 'dark' ? 'light' : 'dark',
        },
      }
    case 'set-theme':
      return { ...state, settings: { ...state.settings, theme: action.theme } }

    case 'toggle-course-enroll':
      return {
        ...state,
        courses: state.courses.map((c) =>
          c.id === action.courseId
            ? { ...c, enrolled: !c.enrolled, lessonsDone: c.enrolled ? 0 : c.lessonsDone }
            : c,
        ),
      }

    case 'complete-next-lesson':
      return {
        ...state,
        courses: state.courses.map((c) =>
          c.id === action.courseId && c.lessonsDone < c.lessonsTotal
            ? { ...c, lessonsDone: c.lessonsDone + 1 }
            : c,
        ),
      }

    case 'start-task':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.taskId && t.status === 'not_started'
            ? { ...t, status: 'in_progress' }
            : t,
        ),
      }

    case 'submit-task':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.taskId && (t.status === 'not_started' || t.status === 'in_progress')
            ? { ...t, status: 'submitted', submittedAt: new Date().toISOString().slice(0, 10) }
            : t,
        ),
      }

    case 'update-profile': {
      const name = action.name ?? state.user.name
      return {
        ...state,
        user: {
          ...state.user,
          name,
          email: action.email ?? state.user.email,
          role: action.role ?? state.user.role,
          initials: initialsFromName(name),
        },
      }
    }

    case 'toggle-email-digest':
      return { ...state, settings: { ...state.settings, emailDigest: !state.settings.emailDigest } }

    case 'toggle-deadline-reminders':
      return {
        ...state,
        settings: { ...state.settings, deadlineReminders: !state.settings.deadlineReminders },
      }

    case 'upgrade-plan':
      return { ...state, user: { ...state.user, plan: 'pro', trialDaysLeft: 0 } }

    case 'reset':
      return action.data

    default:
      return state
  }
}

interface AppContextValue {
  data: AppData
  theme: Theme
  dispatch: React.Dispatch<Action>
}

const AppContext = createContext<AppContextValue | null>(null)

const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}

function AppProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, undefined, loadState)

  // Сохраняем всё состояние при каждом изменении.
  // ТЗ, раздел 02: тема, отметки уроков, записи на курсы, статусы заданий,
  // правки профиля — всё переживает F5.
  useEffect(() => {
    saveState(data)
  }, [data])

  // Тёмная тема применяется на корень документа классом .dark.
  // ТЗ, раздел 02: «Полноценная, на переменных... применяется ко всем экранам и графикам».
  useEffect(() => {
    document.documentElement.classList.toggle('dark', data.settings.theme === 'dark')
  }, [data.settings.theme])

  const value = useMemo<AppContextValue>(
    () => ({ data, theme: data.settings.theme, dispatch }),
    [data],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

/* ============================================================
   БАЗОВЫЕ ЭЛЕМЕНТЫ
   ============================================================ */

const Card = ({
  className = '',
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`card ${className}`} {...rest}>
    {children}
  </div>
)

interface PanelProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  actions?: ReactNode
  className?: string
  bodyClassName?: string
  children: ReactNode
}

function Panel({ title, subtitle, icon, actions, className = '', bodyClassName = 'panel-body', children }: PanelProps) {
  return (
    <Card className={`panel ${className}`}>
      <div className="panel-head">
        <div className="panel-head-text">
          <h2 className="panel-title">
            {icon}
            {title}
          </h2>
          {subtitle && <p className="panel-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="panel-actions">{actions}</div>}
      </div>
      <div className={bodyClassName}>{children}</div>
    </Card>
  )
}

const Badge = ({
  color = 'info',
  children,
  soft = true,
}: {
  color?: ColorKey
  children: ReactNode
  soft?: boolean
}) => (
  <span
    className="badge"
    style={
      soft
        ? { background: cssSoft(color), color: cssColor(color) }
        : { background: cssColor(color), color: '#fff' }
    }
  >
    {children}
  </span>
)

const Dot = ({ color }: { color: ColorKey }) => (
  <span className="dot" style={{ background: cssColor(color) }} aria-hidden />
)

const Progress = ({
  value,
  color = 'accent',
  className = '',
}: {
  value: number
  color?: ColorKey
  className?: string
}) => (
  <div className={`progress ${className}`}>
    <div
      className="progress-fill"
      style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: cssColor(color) }}
    />
  </div>
)

const Avatar = ({
  initials,
  color = 'accent',
  size = 32,
}: {
  initials: string
  color?: ColorKey
  size?: number
}) => (
  <span
    className="avatar"
    style={{
      width: size,
      height: size,
      fontSize: size * 0.36,
      background: cssSoft(color),
      color: cssColor(color),
    }}
  >
    {initials}
  </span>
)

function SearchBox({
  value,
  onChange,
  placeholder = 'Поиск',
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <label className={`search-box ${className}`}>
      <Search size={15} className="search-icon" aria-hidden />
      <input
        className="input"
        maxLength={100}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function Select({
  value,
  onChange,
  options,
  className = '',
  ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  className?: string
  ariaLabel?: string
}) {
  return (
    <div className={`select ${className}`}>
      <select
        className="input"
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="select-arrow" aria-hidden />
    </div>
  )
}

function Tabs({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; count?: number }[]
}) {
  return (
    <div className="tabs" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`tab ${value === o.value ? 'active' : ''}`}
        >
          {o.label}
          {o.count !== undefined && <span className="tab-count">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`toggle ${checked ? 'on' : ''}`}
    >
      <span className="toggle-thumb" aria-hidden />
    </button>
  )
}

function EmptyState({
  icon = <Info size={18} />,
  title,
  hint,
}: {
  icon?: ReactNode
  title: string
  hint?: string
}) {
  return (
    <div className="empty">
      <span className="empty-icon">{icon}</span>
      <p className="empty-title">{title}</p>
      {hint && <p className="empty-hint">{hint}</p>}
    </div>
  )
}

function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="page-header">
      <div className="page-header-text">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

/* ============================================================
   ОБОЛОЧКА: SIDEBAR + TOPBAR + LAYOUT
   ============================================================ */

// Пункты меню. Названия — по ТЗ, раздел 01, таблица экранов.
// Иконки — по смыслу, из lucide-react.
const NAV_ITEMS = [
  { to: '/', label: 'Обзор', icon: Home, end: true },
  {
    to: '/courses',
    label: 'Курсы',
    icon: BookOpen,
    children: [
      { to: '/courses', label: 'Все курсы' },
      { to: '/courses/my', label: 'Мои курсы' },
    ],
  },
  { to: '/categories', label: 'Категории', icon: Shapes },
  {
    to: '/assignments',
    label: 'Задания',
    icon: ClipboardList,
    children: [
      { to: '/assignments/current', label: 'Текущие' },
      { to: '/assignments/sent', label: 'Отправленные' },
      { to: '/assignments/checked', label: 'Проверенные' },
    ],
  },
  { to: '/resources', label: 'Материалы', icon: FolderOpen },
  { to: '/settings', label: 'Настройки', icon: SettingsIcon },
]

function Sidebar({
  collapsed,
  onCollapse,
  onNavigate,
}: {
  collapsed: boolean
  onCollapse: () => void
  onNavigate?: () => void
}) {
  const { data, dispatch } = useApp()
  const location = useLocation()

  // Открытые подпункты. По умолчанию открываем те, что совпадают с текущим путём.
  const [open, setOpen] = useState<string[]>(() =>
    NAV_ITEMS.filter((i) => i.children && location.pathname.startsWith(i.to)).map((i) => i.to),
  )

  const toggleOpen = (to: string) =>
    setOpen((prev) => (prev.includes(to) ? prev.filter((x) => x !== to) : [...prev, to]))

  const linkClass = (active: boolean) => `nav-link ${active ? 'active' : ''}`

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand">
          <span className="brand-mark">
            <i /><i /><i />
          </span>
          {!collapsed && <span className="brand-name">Knowvio</span>}
        </div>
        {!collapsed && (
          <button
            type="button"
            onClick={onCollapse}
            className="icon-btn ghost"
            aria-label="Свернуть меню"
          >
            <Menu size={16} />
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        <ul>
          {NAV_ITEMS.map((item) => {
            const hasChildren = !!item.children
            const isOpen = open.includes(item.to)
            const isActive =
              location.pathname === item.to ||
              (item.to !== '/' && location.pathname.startsWith(item.to))
            const ItemIcon = item.icon

            return (
              <li key={item.to}>
                {hasChildren && !collapsed ? (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleOpen(item.to)}
                      className={`${linkClass(isActive)} nav-link-button`}
                    >
                      <ItemIcon size={16} />
                      <span className="nav-link-text">{item.label}</span>
                      <ChevronDown size={14} className={`chev ${isOpen ? '' : 'rot'}`} />
                    </button>
                    {isOpen && (
                      <ul className="sub-nav">
                        {item.children!.map((c) => (
                          <li key={c.to}>
                            <NavLink
                              to={c.to}
                              end
                              onClick={onNavigate}
                              className={({ isActive }) =>
                                `sub-link ${isActive ? 'active' : ''}`
                              }
                            >
                              {c.label}
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `${linkClass(isActive)} ${collapsed ? 'center' : ''}`
                    }
                  >
                    <ItemIcon size={16} />
                    {!collapsed && <span className="nav-link-text">{item.label}</span>}
                  </NavLink>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="sidebar-bottom">
        {!collapsed && data.user.plan === 'free' && (
          <div className="plan-card">
            <div className="plan-head">
              <span className="plan-title">
                <Crown size={14} className="text-accent" /> Тариф
                <span className="plan-tag">Pro</span>
              </span>
            </div>
            <div className="plan-row">
              <span className="plan-days">Осталось {data.user.trialDaysLeft} дн.</span>
              <Progress value={(data.user.trialDaysLeft / 14) * 100} />
            </div>
            <p className="plan-hint">Пробный период заканчивается, продлите доступ.</p>
            <button
              type="button"
              onClick={() => dispatch({ type: 'upgrade-plan' })}
              className="btn btn-primary h-8 w-full"
            >
              Перейти на Pro
            </button>
          </div>
        )}

        <div className={`theme-row ${collapsed ? 'center' : ''}`}>
          <Palette size={16} />
          {!collapsed && (
            <>
              <span className="flex-1">Тёмная тема</span>
              <ThemeToggle />
            </>
          )}
        </div>

        <button
          type="button"
          className={`${linkClass(false)} nav-link-button ${collapsed ? 'center' : ''}`}
        >
          <LogOut size={16} />
          {!collapsed && <span className="nav-link-text">Выйти</span>}
        </button>

        <div className={`user-row ${collapsed ? 'center' : ''}`}>
          <Avatar initials={data.user.initials} size={collapsed ? 28 : 32} />
          {!collapsed && (
            <div className="user-meta">
              <p className="user-name">{data.user.name}</p>
              <p className="user-plan">
                {data.user.plan === 'pro' ? 'Тариф Pro' : 'Бесплатный тариф'}
              </p>
            </div>
          )}
        </div>
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={onCollapse}
          className="icon-btn ghost expand"
          aria-label="Развернуть меню"
        >
          <Menu size={16} className="rot180" />
        </button>
      )}
    </aside>
  )
}

function ThemeToggle() {
  const { theme, dispatch } = useApp()
  return (
    <Toggle
      checked={theme === 'dark'}
      onChange={() => dispatch({ type: 'toggle-theme' })}
      label="Тёмная тема"
    />
  )
}

// Глобальный поиск. ТЗ, раздел 02, «Оболочка» → «Верхняя панель»:
// «Глобальный поиск по курсам, заданиям и материалам с выпадающими подсказками».
function GlobalSearch() {
  const { data } = useApp()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const wrapRef = useRef<HTMLDivElement>(null)

  // Закрываем подсказки по клику вне блока.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const found: { label: string; hint: string; href: string; icon: ReactNode }[] = []

    for (const c of data.courses) {
      if (c.title.toLowerCase().includes(q) || c.teacher.toLowerCase().includes(q)) {
        found.push({
          label: c.title,
          hint: `Курс · ${c.teacher}`,
          href: `/courses/${c.id}`,
          icon: <BookOpen size={15} />,
        })
      }
    }
    for (const t of data.tasks) {
      if (t.title.toLowerCase().includes(q)) {
        found.push({
          label: t.title,
          hint: `Задание · ${getCourseTitle(data, t.courseId)}`,
          href: '/assignments/current',
          icon: <ClipboardList size={15} />,
        })
      }
    }
    for (const r of data.resources) {
      if (r.title.toLowerCase().includes(q)) {
        found.push({
          label: r.title,
          hint: `Материал · ${getCourseTitle(data, r.courseId)}`,
          href: '/resources',
          icon: <FolderOpen size={15} />,
        })
      }
    }
    return found.slice(0, 7)
  }, [query, data])

  return (
    <div ref={wrapRef} className="global-search">
      <label className="search-box">
        <Search size={15} className="search-icon" aria-hidden />
        <input
          className="input"
          maxLength={100}
          placeholder="Поиск по курсам, заданиям, материалам"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
        />
      </label>

      {open && query.trim().length >= 2 && (
        <div className="suggest">
          {results.length === 0 ? (
            <p className="suggest-empty">Ничего не нашлось по запросу «{query}»</p>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.href}-${i}`}
                type="button"
                onMouseDown={() => {
                  setOpen(false)
                  setQuery('')
                  navigate(r.href)
                }}
                className="suggest-row"
              >
                <span className="suggest-icon">{r.icon}</span>
                <span className="suggest-body">
                  <span className="suggest-title">{r.label}</span>
                  <span className="suggest-hint">{r.hint}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { data, dispatch } = useApp()
  const location = useLocation()

  // Заголовок и подзаголовок верхней панели зависят от текущего экрана.
  const [title, subtitle] = useMemo(() => {
    const p = location.pathname
    if (p === '/') {
      return [
        `С возвращением, ${data.user.name.split(' ')[0]}!`,
        'Сегодня хороший день, чтобы продвинуться по курсам.',
      ]
    }
    if (p.startsWith('/courses/my')) return ['Мои курсы', 'Курсы, на которые вы записаны.']
    if (p.startsWith('/courses/')) return ['Курс', 'Подробная информация и прогресс.']
    if (p.startsWith('/courses')) return ['Курсы', 'Каталог всех курсов платформы.']
    if (p.startsWith('/categories')) return ['Категории', 'Направления обучения.']
    if (p.startsWith('/assignments/sent')) return ['Отправленные', 'Работы, ожидающие проверки.']
    if (p.startsWith('/assignments/checked')) return ['Проверенные', 'Оценки и комментарии преподавателя.']
    if (p.startsWith('/assignments')) return ['Текущие задания', 'Что нужно сделать в ближайшее время.']
    if (p.startsWith('/resources')) return ['Материалы', 'Полезные файлы по курсам.']
    if (p.startsWith('/settings')) return ['Настройки', 'Профиль, оповещения и демо-данные.']
    return ['Knowvio', 'Учебный кабинет студента']
  }, [location.pathname, data.user.name])

  return (
    <header className="topbar">
      <button
        type="button"
        onClick={onMenu}
        className="icon-btn lg-hidden"
        aria-label="Открыть меню"
      >
        <Menu size={16} />
      </button>

      <div className="topbar-title">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="topbar-tools">
        <GlobalSearch />
        <button
          type="button"
          className="icon-btn"
          aria-label="Сменить тему"
          onClick={() => dispatch({ type: 'toggle-theme' })}
        >
          {data.settings.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button type="button" className="icon-btn" aria-label="Уведомления">
          <Bell size={16} />
        </button>
      </div>
    </header>
  )
}

function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  // При смене роута мобильный сайдбар закрывается.
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // ТЗ, раздел 02, «Оболочка» → «Боковая панель»:
  // «Пока она открыта, страница под ней не прокручивается».
  useEffect(() => {
    if (!mobileOpen) return
    const y = window.scrollY
    const body = document.body
    const prev = body.getAttribute('style') ?? ''
    body.style.cssText = `position:fixed;top:${-y}px;left:0;right:0;overflow:hidden`
    return () => {
      body.setAttribute('style', prev)
      window.scrollTo(0, y)
    }
  }, [mobileOpen])

  return (
    <div className="app">
      <div className="sidebar-holder">
        <Sidebar collapsed={collapsed} onCollapse={() => setCollapsed((v) => !v)} />
      </div>

      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label="Закрыть меню"
            className="overlay"
            onClick={() => setMobileOpen(false)}
          />
          <div className="mobile-drawer">
            <Sidebar
              collapsed={false}
              onCollapse={() => setMobileOpen(false)}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </>
      )}

      <div className="main">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/* ============================================================
   СТРАНИЦА: ОБЗОР
   ============================================================ */

// ТЗ, раздел 02, «Обзор» → «График прогресса по месяцам»:
// «Линия или столбцы по ряду progress». В data.json ряда progress нет —
// есть только weeklyActivity и tasks. Поэтому строим прогресс
// по месяцам из того, что есть: количество завершённых заданий
// по месяцам (submittedAt у graded/submitted).
//
// Это осознанное решение: ТЗ говорит «из данных», а не «из ряда progress».

function buildMonthlyProgress(data: AppData) {
  // Собираем все закрытые задания и группируем по месяцу submittedAt.
  const buckets = new Map<string, { month: string; done: number }>()

  // Инициализируем последние 6 месяцев, чтобы график не был пустым,
  // даже если заданий в каком-то месяце нет.
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    buckets.set(key, { month: key, done: 0 })
  }

  for (const t of data.tasks) {
    if (t.status !== 'graded' && t.status !== 'submitted') continue
    const iso = t.submittedAt ?? t.dueDate
    const key = iso.slice(0, 7)
    const bucket = buckets.get(key)
    if (bucket) bucket.done += 1
  }

  return Array.from(buckets.values())
}

function Dashboard() {
  const { data } = useApp()
  const summary = getSummary(data)
  const openTasks = getOpenTasks(data).slice(0, 5)
  const monthly = useMemo(() => buildMonthlyProgress(data), [data])
  const weekly = data.weeklyActivity
  const weeklyTotal = weekly.reduce((s, i) => s + i.hours, 0)

  return (
    <div className="stack">
      {/* Сводка — 4 показателя из данных. */}
      <section className="stats-grid">
        <StatCard
          icon={<GraduationCap size={15} />}
          label="Курсов в работе"
          value={String(summary.coursesInProgress)}
          hint={`из ${data.courses.length} доступных`}
        />
        <StatCard
          icon={<BookOpen size={15} />}
          label="Уроков пройдено"
          value={`${summary.lessonsDone}/${summary.lessonsTotal}`}
          hint="по открытым курсам"
        />
        <StatCard
          icon={<Target size={15} />}
          label="Средний балл"
          value={`${summary.averageScore}%`}
          hint="по проверенным заданиям"
        />
        <StatCard
          icon={<Clock size={15} />}
          label="Часов за неделю"
          value={String(summary.hoursPerWeek)}
          hint="суммарно по активностям"
        />
      </section>

      <div className="grid-2-1">
        <Panel
          title="Прогресс по месяцам"
          subtitle="Сколько заданий закрыто в каждом месяце."
        >
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthly} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border-soft)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickFormatter={(v: string) => formatMonthRu(v).split(' ')[0]}
                  tick={{ fill: 'var(--text-faint)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: 'var(--text-faint)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    fontSize: 12,
                    color: 'var(--text)',
                  }}// @ts-ignore
                  labelFormatter={(v: string) => formatMonthRu(v)} // @ts-ignore
                  formatter={(value: number) => [`${value} заданий`, 'Закрыто']}
                />
                <Area
                  type="monotone"
                  dataKey="done"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill="url(#progressFill)"
                  activeDot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--surface)', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Активность за неделю" subtitle="Распределение часов по направлениям.">
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={weekly}
                  dataKey="hours"
                  nameKey="label"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={2}
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                  isAnimationActive={false}
                >
                  {weekly.map((i) => (
                    <Cell key={i.label} fill={cssColor(i.color)} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    fontSize: 12,
                    color: 'var(--text)',
                  }} // @ts-ignore
                  formatter={(value: number, name: string) => [`${value} ч`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center" aria-hidden>
              <span className="donut-center-label">Всего часов</span>
              <span className="donut-center-value">{weeklyTotal}</span>
            </div>
          </div>

          <ul className="legend">
            {weekly.map((i) => (
              <li key={i.label} className="legend-item">
                <Dot color={i.color} />
                <span className="legend-label">{i.label}</span>
                <span className="legend-value">
                  {weeklyTotal ? Math.round((i.hours / weeklyTotal) * 100) : 0}%
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel
        title="Ближайшие дедлайны"
        subtitle="Незакрытые задания по возрастанию срока."
        actions={
          <NavLink to="/assignments/current" className="btn h-9 text-xs">
            Все задания
          </NavLink>
        }
      >
        {openTasks.length === 0 ? (
          <EmptyState
            icon={<Check size={18} />}
            title="Все задания закрыты"
            hint="Ближайших дедлайнов нет."
          />
        ) : (
          <ul className="deadline-list">
            {openTasks.map((t) => (
              <DeadlineRow key={t.id} task={t} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card className="stat-card">
      <div className="stat-head">
        {icon}
        <span className="stat-label">{label}</span>
      </div>
      <p className="stat-value">{value}</p>
      {hint && <p className="stat-hint">{hint}</p>}
    </Card>
  )
}

// ТЗ, раздел 03: «Просроченное задание» и «Срок сегодня» подписываются отдельно.
function DeadlineRow({ task }: { task: Task }) {
  const { data, dispatch } = useApp()
  const today = new Date().toISOString().slice(0, 10)
  const overdue = task.dueDate < today
  const isToday = task.dueDate === today

  return (
    <li className={`deadline-row ${overdue ? 'overdue' : ''} ${isToday ? 'today' : ''}`}>
      <Dot color={TASK_STATUS_COLOR[task.status]} />
      <div className="deadline-body">
        <p className="deadline-title">{task.title}</p>
        <p className="deadline-meta">
          {getCourseTitle(data, task.courseId)} · {TASK_KIND_LABEL[task.kind]}
        </p>
      </div>
      <div className="deadline-date">
        <p className="deadline-date-value">{formatDate(task.dueDate)}</p>
        <p className={`deadline-date-hint ${overdue ? 'overdue' : isToday ? 'today' : ''}`}>
          {overdue ? 'Просрочено' : isToday ? 'Срок сегодня' : 'Скоро'}
        </p>
      </div>
      {task.status === 'not_started' && (
        <button
          type="button"
          className="btn h-8 text-xs"
          onClick={() => dispatch({ type: 'start-task', taskId: task.id })}
        >
          Начать
        </button>
      )}
      {task.status === 'in_progress' && (
        <button
          type="button"
          className="btn btn-accent h-8 text-xs"
          onClick={() => dispatch({ type: 'submit-task', taskId: task.id })}
        >
          <Send size={13} /> Сдать
        </button>
      )}
    </li>
  )
}

/* ============================================================
   СТРАНИЦА: КУРСЫ (общий компонент для /courses и /courses/my)
   ============================================================ */

function CoursesPage({ onlyMine = false }: { onlyMine?: boolean }) {
  const { data } = useApp()

  // Все фильтры живут в URL. ТЗ, раздел 02, «Общее» → «Состояние в адресной строке».
  // На /courses/my параметр scope жёстко = 'mine', пользователь его не меняет.
  const [searchParams, setSearchParams] = useSearchParams()

  const query = searchParams.get('q') ?? ''
  const categoryId = searchParams.get('category') ?? 'all'
  // На /courses/my scope жёстко = 'mine', независимо от того, что в URL.
// Если кто-то вручную дописал ?scope=all, мы это игнорируем и — ниже — подчищаем URL.
const scope = onlyMine
  ? 'mine'
  : ((searchParams.get('scope') as 'all' | 'mine' | 'available') ?? 'all')
  const sort = (searchParams.get('sort') as 'rating' | 'title' | 'hours') ?? 'rating'

  // Обновляем один параметр, не трогая остальные.
  // replace: true — чтобы каждое нажатие не забивало историю.
  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    // Пустые значения и «всё по умолчанию» убираем из URL — так ссылка короче.
    const isDefault =
      (key === 'q' && value === '') ||
      (key === 'category' && value === 'all') ||
      (key === 'scope' && value === 'all') ||
      (key === 'sort' && value === 'rating')
    if (isDefault) next.delete(key)
    else next.set(key, value)
    setSearchParams(next, { replace: true })
  }

  // Если мы на /courses/my, а в URL остался параметр scope — убираем его.
// Это защита от ручного ввода ?scope=all в адресную строку.
useEffect(() => {
  if (!onlyMine) return
  if (!searchParams.has('scope')) return
  const next = new URLSearchParams(searchParams)
  next.delete('scope')
  setSearchParams(next, { replace: true })
}, [onlyMine, searchParams, setSearchParams])

  // Список курсов — та же логика фильтрации, что была, только данные берём из URL.
  const courses = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = data.courses
      .filter((c) =>
        scope === 'mine' ? c.enrolled : scope === 'available' ? !c.enrolled : true,
      )
      .filter((c) => categoryId === 'all' || c.categoryId === categoryId)
      .filter(
        (c) =>
          !q ||
          c.title.toLowerCase().includes(q) ||
          c.teacher.toLowerCase().includes(q),
      )

    return filtered.sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title)
      if (sort === 'hours') return b.hours - a.hours
      return b.averageScore - a.averageScore
    })
  }, [data.courses, query, categoryId, scope, sort])

  return (
    <div className="stack">
      <PageHeader
        title={onlyMine ? 'Мои курсы' : 'Курсы'}
        subtitle={`${plural(courses.length, 'курс', 'курса', 'курсов')} в подборке`}
        actions={
          <>
            <SearchBox
              className="w-full sm:w-56"
              value={query}
              onChange={(v) => updateParam('q', v)}
              placeholder="Название или преподаватель"
            />
            <Select
              className="w-full sm:w-52"
              value={categoryId}
              onChange={(v) => updateParam('category', v)}
              ariaLabel="Категория"
              options={[
                { value: 'all', label: 'Все категории' },
                ...data.categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
            <Select
              className="w-full sm:w-44"
              value={sort}
              onChange={(v) => updateParam('sort', v)}
              ariaLabel="Сортировка"
              options={[
                { value: 'rating', label: 'По рейтингу' },
                { value: 'title', label: 'По названию' },
                { value: 'hours', label: 'По часам' },
              ]}
            />
          </>
        }
      />

      {/* На /courses/my табы не переключаются, потому что scope жёстко 'mine'. */}
      {!onlyMine && (
        <Tabs
          value={scope}
          onChange={(v) => updateParam('scope', v)}
          options={[
            { value: 'all', label: 'Все', count: data.courses.length },
            { value: 'mine', label: 'Мои', count: data.courses.filter((c) => c.enrolled).length },
            {
              value: 'available',
              label: 'Доступные',
              count: data.courses.filter((c) => !c.enrolled).length,
            },
          ]}
        />
      )}

      {courses.length === 0 ? (
        <Card>
          <EmptyState
            icon={<SearchX size={18} />}
            title="Курсы не найдены"
            hint="Измените запрос или снимите фильтр по категории."
          />
        </Card>
      ) : (
        <div className="grid-cards">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}
    </div>
  )
}

function CourseCard({ course }: { course: Course }) {
  const { data, dispatch } = useApp()
  const category = getCategory(data, course.categoryId)
const accent: ColorKey = category?.color ?? 'accent'

  const progress = course.lessonsTotal
    ? Math.round((course.lessonsDone / course.lessonsTotal) * 100)
    : 0

  // ТЗ, раздел 03, «Мест не осталось»: пометка + неактивная кнопка.
  const noSeats = course.seatsLeft === 0
  const fewSeats = course.seatsLeft > 0 && course.seatsLeft <= 5

  return (
    <Card className="course-card">
      {/* Шапка: иконка категории + бейдж */}
      <div className="course-head">
        <span
          className="course-icon"
          style={{ background: cssSoft(accent), color: cssColor(accent) }}
        >
          <BookOpen size={18} />
        </span>
        <div className="course-head-badges">
          {course.enrolled ? (
            <Badge color="ok">Вы записаны</Badge>
          ) : (
            <Badge color="info">Открыт набор</Badge>
          )}
          {category && <Badge color={accent}>{category.name}</Badge>}
        </div>
      </div>

      {/* Название. ТЗ, раздел 03: длинное название не должно ломать сетку. */}
      <NavLink to={`/courses/${course.id}`} className="course-title">
        {course.title}
      </NavLink>

      <p className="course-desc">{course.description}</p>

      {/* Теги (опционально, если хочется ближе к референсу) */}
      {course.tags.length > 0 && (
        <ul className="course-tags">
          {course.tags.slice(0, 3).map((t) => (
            <li key={t} className="course-tag">{t}</li>
          ))}
        </ul>
      )}

      {/* Метаданные: уровень, уроки, часы */}
      <dl className="course-meta">
        <div>
          <dt>Уровень</dt>
          <dd>{LEVEL_LABEL[course.level]}</dd>
        </div>
        <div>
          <dt>Уроков</dt>
          <dd>{course.lessonsTotal}</dd>
        </div>
        <div>
          <dt>Часов</dt>
          <dd>{course.hours}</dd>
        </div>
      </dl>

      {/* Рейтинг + отзывы. ТЗ, раздел 02, «Карточка курса в каталоге». */}
      <div className="course-rating">
        <span className="course-rating-star" aria-hidden>★</span>
        <span className="course-rating-value">{formatRating(course.rating)}</span>
        <span className="course-rating-reviews">({course.reviews})</span>
      </div>

      {/* Прогресс для записанных, кнопка «Записаться» для остальных. */}
      {course.enrolled ? (
        <div className="course-progress">
          <Progress value={progress} color={accent} />
          <span className="course-progress-value">{progress}%</span>
        </div>
      ) : (
        <div className="course-progress-empty">
          <span className="course-progress-label">Не записан</span>
        </div>
      )}

      {/* Цена + старая цена. ТЗ, раздел 03: «Пустого места и пустой зачёркнутой строки быть не должно». */}
      {!course.enrolled && (
        <div className="course-price">
          <span className={`course-price-current ${course.price === 0 ? 'free' : ''}`}>
            {formatPrice(course.price)}
          </span>
          {course.oldPrice !== undefined && (
            <span className="course-price-old">{formatPrice(course.oldPrice)}</span>
          )}
        </div>
      )}

      {/* Предупреждение о местах. */}
      {noSeats && <div className="course-warning danger">Мест нет</div>}
      {fewSeats && (
        <div className="course-warning warn">Осталось {course.seatsLeft} мест</div>
      )}

      {/* Кнопки */}
      <div className="course-actions">
        <button
          type="button"
          className={`btn h-8 flex-1 text-xs ${course.enrolled ? '' : 'btn-accent'}`}
          disabled={!course.enrolled && noSeats}
          onClick={() => dispatch({ type: 'toggle-course-enroll', courseId: course.id })}
        >
          {course.enrolled ? (
            <>
              <Check size={13} /> Отписаться
            </>
          ) : noSeats ? (
            <>Мест нет</>
          ) : (
            <>
              <Plus size={13} /> Записаться
            </>
          )}
        </button>
        <NavLink
          to={`/courses/${course.id}`}
          className="btn h-8 px-2.5 text-xs"
          aria-label="Открыть курс"
        >
          <ExternalLink size={14} />
        </NavLink>
      </div>

      <p className="course-teacher">Преподаватель: {course.teacher}</p>
    </Card>
  )
}
/* ============================================================
   СТРАНИЦА: КУРС
   ============================================================ */
function CourseDetailPage() {
  const { data, dispatch } = useApp()
  const { id = '' } = useParams()
  const course = getCourse(data, id)

  // ТЗ, раздел 02, «Курсы» → «Страница курса»: «Несуществующий id ведёт на заглушку».
  if (!course) {
    return (
      <Card>
        <EmptyState
          icon={<SearchX size={18} />}
          title="Курс не найден"
          hint="Возможно, ссылка устарела. Вернитесь в каталог."
        />
      </Card>
    )
  }

  const category = getCategory(data, course.categoryId)
  const progress = course.lessonsTotal
    ? Math.round((course.lessonsDone / course.lessonsTotal) * 100)
    : 0
  const courseTasks = data.tasks.filter((t) => t.courseId === course.id)
  const resources = getCourseResources(data, course.id)
  const canComplete = course.enrolled && course.lessonsDone < course.lessonsTotal

  return (
    <div className="stack">
      <PageHeader
        title={course.title}
        subtitle={`${category?.name ?? 'Без категории'} · ${course.teacher} · ${LEVEL_LABEL[course.level]}`}
        actions={
          <>
            <NavLink to="/courses" className="btn h-9 text-xs">
              К списку
            </NavLink>
            <button
              type="button"
              className="btn btn-accent h-9 text-xs"
              disabled={!canComplete}
              onClick={() => dispatch({ type: 'complete-next-lesson', courseId: course.id })}
            >
              Пройден следующий урок
            </button>
          </>
        }
      />

      <div className="grid-2-1">
        <div className="stack">
          <Card className="p-4">
            <p className="course-long-desc">{course.description}</p>

            <div className="progress-row">
              <Progress value={progress} color={course.color} />
              <span className="progress-value">{progress}%</span>
            </div>

            <div className="meta-grid">
              {[
                { label: 'Уроков пройдено', value: `${course.lessonsDone} из ${course.lessonsTotal}` },
                { label: 'Часов курса', value: String(course.hours) },
                {
                  label: 'Средний балл',
                  value: course.averageScore ? `${course.averageScore}%` : 'нет оценок',
                },
                { label: 'Обновлён', value: formatDate(course.updatedAt) },
              ].map((x) => (
                <div key={x.label} className="meta-tile">
                  <p className="meta-label">{x.label}</p>
                  <p className="meta-value">{x.value}</p>
                </div>
              ))}
            </div>

            <div className="course-detail-actions">
              <button
                type="button"
                className={`btn h-9 text-xs ${course.enrolled ? '' : 'btn-accent'}`}
                onClick={() => dispatch({ type: 'toggle-course-enroll', courseId: course.id })}
              >
                {course.enrolled ? 'Отписаться от курса' : 'Записаться на курс'}
              </button>
            </div>
          </Card>
              <Panel
  title="Программа курса"
  icon={<BookOpen size={16} className="text-muted" />}
  subtitle={`${course.lessonsTotal} ${plural(course.lessonsTotal, 'урок', 'урока', 'уроков')} · ${course.lessonsDone} пройдено`}
>
  {course.lessons.length === 0 ? (
    <EmptyState
      icon={<BookOpen size={18} />}
      title="Уроки пока не добавлены"
    />
  ) : (
    <ol className="lesson-list">
      {course.lessons.map((lesson, index) => {
        const done = index < course.lessonsDone
        return (
          <li
            key={lesson.id}
            className={`lesson-row ${done ? 'done' : ''}`}
          >
            <span className="lesson-index" aria-hidden>
              {done ? <Check size={12} /> : index + 1}
            </span>

            <div className="lesson-body">
              <p className="lesson-title">{lesson.title}</p>
              <p className="lesson-meta">
                <Clock size={12} aria-hidden />
                {lesson.minutes} мин
                {lesson.free && <> · <span className="lesson-free">Бесплатно</span></>}
              </p>
            </div>

            {done && <span className="lesson-done-badge">Пройден</span>}
          </li>
        )
      })}
    </ol>
  )}
</Panel>
          <Panel title="Задания курса" icon={<ClipboardList size={16} className="text-muted" />}>
            {courseTasks.length === 0 ? (
              <EmptyState icon={<ClipboardCheck size={18} />} title="Заданий пока нет" />
            ) : (
              <ul className="simple-list">
                {courseTasks.map((t) => (
                  <li key={t.id}>
                    <div className="min-w-0 flex-1">
                      <p className="simple-title">{t.title}</p>
                      <p className="simple-hint">Срок: {formatDate(t.dueDate)}</p>
                    </div>
                    {typeof t.score === 'number' && <span className="score">{t.score}%</span>}
                    <Badge color={TASK_STATUS_COLOR[t.status]}>
                      {TASK_STATUS_LABEL[t.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="stack">
          <Panel title="Материалы" icon={<FolderOpen size={16} className="text-muted" />}>
            {resources.length === 0 ? (
              <EmptyState icon={<FolderOpen size={18} />} title="Материалов нет" />
            ) : (
              <ul className="simple-list">
                {resources.map((r) => (
                  <li key={r.id}>
                    <ResourceIcon kind={r.kind} />
                    <span className="min-w-0 flex-1 truncate text-[13px]">{r.title}</span>
                    <span className="simple-hint">{RESOURCE_KIND_LABEL[r.kind]}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}

function ResourceIcon({ kind }: { kind: Resource['kind'] }) {
  const color = RESOURCE_KIND_COLOR[kind]
  const icon =
    kind === 'video' ? (
      <PlayCircle size={15} />
    ) : kind === 'link' ? (
      <LinkIcon size={15} />
    ) : kind === 'code' ? (
      <Code2 size={15} />
    ) : kind === 'dataset' ? (
      <Database size={15} />
    ) : (
      <FileText size={15} />
    )
  return (
    <span className="resource-icon" style={{ background: cssSoft(color), color: cssColor(color) }}>
      {icon}
    </span>
  )
}

/* ============================================================
   СТРАНИЦА: КАТЕГОРИИ
   ============================================================ */

function CategoriesPage() {
  const { data } = useApp()
  const [query, setQuery] = useState('')

  const categories = data.categories.filter((c) =>
    c.name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <div className="stack">
      <PageHeader
        title="Категории"
        subtitle="Направления обучения и курсы внутри каждого."
        actions={
          <SearchBox
            className="w-full sm:w-56"
            value={query}
            onChange={setQuery}
            placeholder="Название категории"
          />
        }
      />

      {categories.length === 0 ? (
        <Card>
          <EmptyState icon={<Shapes size={18} />} title="Категорий не найдено" />
        </Card>
      ) : (
        <div className="grid-cards">
          {categories.map((c) => {
            const list = getCoursesByCategory(data, c.id)
            const enrolled = list.filter((x) => x.enrolled)
            const totalLessons = enrolled.reduce((s, x) => s + x.lessonsTotal, 0)
            const doneLessons = enrolled.reduce((s, x) => s + x.lessonsDone, 0)
            const pct = totalLessons ? Math.round((doneLessons / totalLessons) * 100) : 0

            return (
              <Card key={c.id} className="p-4">
                <div className="course-head">
                  <span
                    className="course-icon"
                    style={{ background: cssSoft(c.color), color: cssColor(c.color) }}
                  >
                    <Shapes size={18} />
                  </span>
                  <Badge color={c.color}>
                    {plural(list.length, 'курс', 'курса', 'курсов')}
                  </Badge>
                </div>

                <h2 className="category-title">{c.name}</h2>
                <p className="category-desc">{c.description}</p>

                {/* Счётчики курсов и часов — из ТЗ, раздел 02, «Категории»:
                    «у каждой число курсов и суммарные часы, посчитанные из данных». */}
                <dl className="category-stats">
                  <div>
                    <dt>Курсов</dt>
                    <dd>{list.length}</dd>
                  </div>
                  <div>
                    <dt>Часов всего</dt>
                    <dd>{list.reduce((s, x) => s + x.hours, 0)}</dd>
                  </div>
                  <div>
                    <dt>Ваш прогресс</dt>
                    <dd>{pct}%</dd>
                  </div>
                </dl>

                <Progress value={pct} color={c.color} className="mt-1" />

                <ul className="category-list">
                  {list.slice(0, 3).map((course) => (
                    <li key={course.id}>
                      <NavLink to={`/courses/${course.id}`} className="category-row">
                        <Dot color={c.color} />
                        <span className="min-w-0 flex-1 truncate">{course.title}</span>
                        <span className="simple-hint">
                          {course.lessonsDone}/{course.lessonsTotal}
                        </span>
                      </NavLink>
                    </li>
                  ))}
                  {list.length === 0 && (
                    <li className="category-empty">Курсов в категории пока нет</li>
                  )}
                </ul>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ============================================================
   СТРАНИЦА: ЗАДАНИЯ
   ============================================================ */

// ТЗ, раздел 01, таблица экранов: `/assignments/:tab` со значениями
// «текущие, отправленные, проверенные». Роут `/assignments` уводит на текущие.
const ASSIGNMENT_TABS = ['current', 'sent', 'checked'] as const
type AssignmentTab = (typeof ASSIGNMENT_TABS)[number]

const ASSIGNMENT_TITLE: Record<AssignmentTab, string> = {
  current: 'Текущие задания',
  sent: 'Отправленные на проверку',
  checked: 'Проверенные работы',
}

function AssignmentsPage() {
  const { data, dispatch } = useApp()
  const navigate = useNavigate()
  const { tab = 'current' } = useParams<{ tab: AssignmentTab }>()
  const safeTab: AssignmentTab = ASSIGNMENT_TABS.includes(tab as AssignmentTab)
    ? (tab as AssignmentTab)
    : 'current'

  // Фильтры — в URL. ТЗ, раздел 02, «Общее» → «Состояние в адресной строке».
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const courseFilter = searchParams.get('course') ?? 'all'

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    const isDefault =
      (key === 'q' && value === '') || (key === 'course' && value === 'all')
    if (isDefault) next.delete(key)
    else next.set(key, value)
    setSearchParams(next, { replace: true })
  }

  // При смене вкладки переносим фильтры в новый URL — так прямая ссылка на вкладку
  // сохраняет текущий поиск.
  const switchTab = (v: string) => {
    const next = new URLSearchParams(searchParams)
    navigate(`/assignments/${v}${next.toString() ? `?${next}` : ''}`)
  }

  const tasks = useMemo(() => {
    const base =
      safeTab === 'current'
        ? getOpenTasks(data)
        : safeTab === 'sent'
          ? getSubmittedTasks(data)
          : getGradedTasks(data)

    const q = query.trim().toLowerCase()
    return base
      .filter((t) => courseFilter === 'all' || t.courseId === courseFilter)
      .filter((t) => !q || t.title.toLowerCase().includes(q))
  }, [data, safeTab, query, courseFilter])

  const counts = {
    current: getOpenTasks(data).length,
    sent: getSubmittedTasks(data).length,
    checked: getGradedTasks(data).length,
  }

  const graded = getGradedTasks(data)
  const avgScore = graded.length
    ? Math.round(graded.reduce((s, t) => s + (t.score ?? 0), 0) / graded.length)
    : 0

  return (
    <div className="stack">
      <PageHeader
        title={ASSIGNMENT_TITLE[safeTab]}
        subtitle="Работы по курсам, сроки и комментарии преподавателя."
        actions={
          <>
            <SearchBox
              className="w-full sm:w-56"
              value={query}
              onChange={(v) => updateParam('q', v)}
              placeholder="Название задания"
            />
            <Select
              className="w-full sm:w-56"
              value={courseFilter}
              onChange={(v) => updateParam('course', v)}
              ariaLabel="Курс"
              options={[
                { value: 'all', label: 'Все курсы' },
                ...data.courses.map((c) => ({ value: c.id, label: c.title })),
              ]}
            />
          </>
        }
      />

      <Tabs
        value={safeTab}
        onChange={switchTab}
        options={[
          { value: 'current', label: 'Текущие', count: counts.current },
          { value: 'sent', label: 'Отправленные', count: counts.sent },
          { value: 'checked', label: 'Проверенные', count: counts.checked },
        ]}
      />

      {safeTab === 'checked' && tasks.length > 0 && (
        <Card className="feedback-summary">
          <div>
            <p className="simple-hint">Средний балл по проверенным</p>
            <p className="feedback-score">{avgScore}%</p>
          </div>
          <Progress
            value={avgScore}
            className="flex-1"
            color={avgScore >= 70 ? 'ok' : 'accent'}
          />
        </Card>
      )}

      {tasks.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardCheck size={18} />}
            title="Здесь пусто"
            hint={
              safeTab === 'current'
                ? 'Все задания сданы. Отдыхайте.'
                : 'Ничего не подходит под фильтры.'
            }
          />
        </Card>
      ) : (
        <div className="stack-sm">
          {tasks.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="assignment-head">
                <div className="min-w-0">
                  <div className="assignment-title-row">
                    <h3 className="assignment-title">{t.title}</h3>
                    <Badge color={TASK_STATUS_COLOR[t.status]}>
                      {TASK_STATUS_LABEL[t.status]}
                    </Badge>
                    <Badge color={TASK_PRIORITY_COLOR[t.priority]}>
                      {TASK_PRIORITY_LABEL[t.priority]}
                    </Badge>
                  </div>
                  <p className="assignment-subtitle">
                    <NavLink to={`/courses/${t.courseId}`} className="link">
                      {getCourseTitle(data, t.courseId)}
                    </NavLink>
                    {' · '}
                    {TASK_KIND_LABEL[t.kind]}
                    {' · '}
                    {t.teacher}
                  </p>
                </div>

                <div className="assignment-actions">
                  <div className="text-right">
                    <p className="simple-hint">
                      {t.status === 'graded' || t.status === 'submitted'
                        ? 'Отправлено'
                        : 'Срок сдачи'}
                    </p>
                    <p className="simple-value">
                      {formatDate(t.submittedAt ?? t.dueDate)}
                    </p>
                  </div>

                  {typeof t.score === 'number' && (
                    <div className="score-box">
                      <span>{t.score}</span>
                    </div>
                  )}

                  {t.status === 'not_started' && (
                    <button
                      type="button"
                      className="btn h-8 text-xs"
                      onClick={() => dispatch({ type: 'start-task', taskId: t.id })}
                    >
                      Начать
                    </button>
                  )}
                  {(t.status === 'not_started' || t.status === 'in_progress') && (
                    <button
                      type="button"
                      className="btn btn-accent h-8 text-xs"
                      onClick={() => dispatch({ type: 'submit-task', taskId: t.id })}
                    >
                      <Send size={13} /> Сдать
                    </button>
                  )}
                </div>
              </div>

              {t.feedback && t.status === 'graded' && (
                <p className="feedback">
                  <span className="feedback-label">Комментарий: </span>
                  {t.feedback}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

/* ============================================================
   СТРАНИЦА: МАТЕРИАЛЫ
   ============================================================ */

function ResourcesPage() {
  const { data } = useApp()

  // Фильтры — в URL. ТЗ, раздел 02, «Общее» → «Состояние в адресной строке».
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const courseFilter = searchParams.get('course') ?? 'all'
  const kindFilter = (searchParams.get('kind') as 'all' | Resource['kind']) ?? 'all'

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    const isDefault =
      (key === 'q' && value === '') ||
      (key === 'course' && value === 'all') ||
      (key === 'kind' && value === 'all')
    if (isDefault) next.delete(key)
    else next.set(key, value)
    setSearchParams(next, { replace: true })
  }

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.resources
      .filter((r) => courseFilter === 'all' || r.courseId === courseFilter)
      .filter((r) => kindFilter === 'all' || r.kind === kindFilter)
      .filter((r) => !q || r.title.toLowerCase().includes(q))
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
  }, [data.resources, query, courseFilter, kindFilter])

  const kindTabs: { value: 'all' | Resource['kind']; label: string; count: number }[] = [
    { value: 'all', label: 'Все', count: data.resources.length },
    ...(['pdf', 'video', 'link', 'code', 'dataset'] as Resource['kind'][]).map((k) => ({
      value: k,
      label: RESOURCE_KIND_LABEL[k],
      count: data.resources.filter((r) => r.kind === k).length,
    })),
  ]

  return (
    <div className="stack">
      <PageHeader
        title="Материалы"
        subtitle={`${plural(list.length, 'материал', 'материала', 'материалов')} по вашим курсам`}
        actions={
          <>
            <SearchBox
              className="w-full sm:w-56"
              value={query}
              onChange={(v) => updateParam('q', v)}
              placeholder="Название материала"
            />
            <Select
              className="w-full sm:w-56"
              value={courseFilter}
              onChange={(v) => updateParam('course', v)}
              ariaLabel="Курс"
              options={[
                { value: 'all', label: 'Все курсы' },
                ...data.courses.map((c) => ({ value: c.id, label: c.title })),
              ]}
            />
          </>
        }
      />

      <Tabs
        value={kindFilter}
        onChange={(v) => updateParam('kind', v)}
        options={kindTabs}
      />

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FolderOpen size={18} />}
            title="Материалов не найдено"
            hint="Попробуйте снять фильтр по типу."
          />
        </Card>
      ) : (
        <div className="grid-cards">
          {list.map((r) => (
            <Card key={r.id} className="resource-card">
              <ResourceIcon kind={r.kind} />
              <div className="min-w-0 flex-1">
                <p className="resource-title">{r.title}</p>
                <p className="resource-subtitle">
                  <NavLink to={`/courses/${r.courseId}`} className="link">
                    {getCourseTitle(data, r.courseId)}
                  </NavLink>{' '}
                  · {r.author}
                </p>
                <div className="resource-meta">
                  <Badge color={RESOURCE_KIND_COLOR[r.kind]}>
                    {RESOURCE_KIND_LABEL[r.kind]}
                  </Badge>
                  {r.sizeKb ? (
                    <span className="simple-hint">{formatSize(r.sizeKb)}</span>
                  ) : null}
                  <span className="simple-hint">{formatDate(r.addedAt)}</span>
                </div>
              </div>
              <button type="button" className="icon-btn" aria-label="Открыть материал">
                {r.kind === 'link' ? <ExternalLink size={14} /> : <FileText size={14} />}
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

/* ============================================================
   СТРАНИЦА: НАСТРОЙКИ
   ============================================================ */

function SettingsPage() {
  const { data, dispatch } = useApp()
  const summary = getSummary(data)

  // Локальная форма профиля. Значения синхронизируются при изменении user в контексте.
  const [form, setForm] = useState({
    name: data.user.name,
    email: data.user.email,
    role: data.user.role,
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setForm({ name: data.user.name, email: data.user.email, role: data.user.role })
  }, [data.user.name, data.user.email, data.user.role])

  const dirty =
    form.name !== data.user.name ||
    form.email !== data.user.email ||
    form.role !== data.user.role

  // ТЗ, раздел 02, «Настройки» → «Профиль»:
  // «пустые и некорректные значения не сохраняются, длина полей ограничена».
  const canSave =
    dirty &&
    form.name.trim().length > 0 &&
    form.name.length <= MAX_LENGTHS.name &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
    form.email.length <= MAX_LENGTHS.email &&
    form.role.length <= MAX_LENGTHS.role

  const onSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    dispatch({
      type: 'update-profile',
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role.trim(),
    })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2200)
  }

  return (
    <div className="stack">
      <PageHeader
        title="Настройки"
        subtitle="Профиль, оповещения и демонстрационные данные."
      />

      <div className="grid-2-1">
        <div className="stack">
          <Panel title="Профиль" icon={<UserIcon size={16} className="text-muted" />}>
            <div className="profile-row">
              <Avatar initials={data.user.initials} size={48} />
              <div className="min-w-0">
                <p className="profile-name">{data.user.name}</p>
                <p className="profile-email">{data.user.email}</p>
              </div>
              <Badge color={data.user.plan === 'pro' ? 'ok' : 'warn'}>
                {data.user.plan === 'pro'
                  ? 'Тариф Pro'
                  : `Пробный период, ${data.user.trialDaysLeft} дн.`}
              </Badge>
            </div>

            <form onSubmit={onSave}>
              <div className="form-grid">
                <label className="form-field">
                  <span className="form-label">Имя</span>
                  <input
                    className="input"
                    required
                    maxLength={MAX_LENGTHS.name}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <label className="form-field">
                  <span className="form-label">Почта</span>
                  <input
                    className="input"
                    type="email"
                    required
                    maxLength={MAX_LENGTHS.email}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </label>
                <label className="form-field full">
                  <span className="form-label">Статус</span>
                  <input
                    className="input"
                    maxLength={MAX_LENGTHS.role}
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  />
                </label>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary h-9 text-xs" disabled={!canSave}>
                  <Save size={14} /> Сохранить
                </button>
                {saved && <span className="text-ok text-xs">Профиль обновлён</span>}
                {data.user.plan === 'free' && (
                  <button
                    type="button"
                    className="btn btn-accent ml-auto h-9 text-xs"
                    onClick={() => dispatch({ type: 'upgrade-plan' })}
                  >
                    Перейти на Pro
                  </button>
                )}
              </div>
            </form>
          </Panel>

          <Panel title="Оповещения" icon={<Bell size={16} className="text-muted" />}>
            <ul className="settings-list">
              <li>
                <div className="min-w-0 flex-1">
                  <p className="settings-title">Дайджест на почту</p>
                  <p className="settings-hint">Раз в неделю: прогресс и ближайшие сроки.</p>
                </div>
                <Toggle
                  checked={data.settings.emailDigest}
                  onChange={() => dispatch({ type: 'toggle-email-digest' })}
                  label="Дайджест на почту"
                />
              </li>
              <li>
                <div className="min-w-0 flex-1">
                  <p className="settings-title">Напоминания о сроках</p>
                  <p className="settings-hint">За два дня до сдачи задания.</p>
                </div>
                <Toggle
                  checked={data.settings.deadlineReminders}
                  onChange={() => dispatch({ type: 'toggle-deadline-reminders' })}
                  label="Напоминания о сроках"
                />
              </li>
              <li>
                <div className="min-w-0 flex-1">
                  <p className="settings-title">Тёмная тема</p>
                  <p className="settings-hint">Тот же переключатель, что и в боковом меню.</p>
                </div>
                <Toggle
                  checked={data.settings.theme === 'dark'}
                  onChange={() => dispatch({ type: 'toggle-theme' })}
                  label="Тёмная тема"
                />
              </li>
            </ul>
          </Panel>
        </div>

        <div className="stack">
          <Card className="p-4">
            <p className="simple-hint">Пройдено по открытым курсам</p>
            <p className="completion-value">
              {summary.lessonsTotal
                ? Math.round((summary.lessonsDone / summary.lessonsTotal) * 100)
                : 0}
              %
            </p>
            <Progress
              value={
                summary.lessonsTotal
                  ? Math.round((summary.lessonsDone / summary.lessonsTotal) * 100)
                  : 0
              }
              className="mt-3"
            />
            <dl className="summary-list">
              <div>
                <dt>Курсов открыто</dt>
                <dd>{summary.coursesInProgress}</dd>
              </div>
              <div>
                <dt>Уроков пройдено</dt>
                <dd>
                  {summary.lessonsDone} из {summary.lessonsTotal}
                </dd>
              </div>
              <div>
                <dt>Средний балл</dt>
                <dd>{summary.averageScore}%</dd>
              </div>
              <div>
                <dt>Серия занятий</dt>
                <dd>{data.user.streakDays} дн.</dd>
              </div>
            </dl>
          </Card>

          <Panel
            title="Данные"
            icon={<Database size={16} className="text-muted" />}
            subtitle="Демо-режим: всё хранится в браузере."
          >
            <p className="simple-hint">
              Изменения сохраняются в localStorage под ключом{' '}
              <code className="code">{STORAGE_KEY}</code>. Сброс вернёт исходный набор
              курсов, заданий и материалов.
            </p>

            <dl className="data-grid">
              <div>
                <dt>Курсов</dt>
                <dd>{data.courses.length}</dd>
              </div>
              <div>
                <dt>Заданий</dt>
                <dd>{data.tasks.length}</dd>
              </div>
              <div>
                <dt>Материалов</dt>
                <dd>{data.resources.length}</dd>
              </div>
            </dl>

            <button
              type="button"
              className="btn mt-3 h-9 w-full text-xs"
              onClick={() => dispatch({ type: 'reset', data: resetState() })}
            >
              <RotateCcw size={14} /> Сбросить демо-данные
            </button>
          </Panel>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   СТРАНИЦА: 404
   ============================================================ */

function NotFoundPage() {
  return (
    <Card>
      <EmptyState
        icon={<Compass size={18} />}
        title="Страница не найдена"
        hint="Проверьте адрес или вернитесь на обзор."
      />
    </Card>
  )
}

/* ============================================================
   РОУТЕР
   ============================================================ */

function Router() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/my" element={<CoursesPage onlyMine />} />
        <Route path="courses/:id" element={<CourseDetailPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="assignments" element={<Navigate to="/assignments/current" replace />} />
        <Route path="assignments/:tab" element={<AssignmentsPage />} />
        <Route path="resources" element={<ResourcesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Router />
      </BrowserRouter>
    </AppProvider>
  )
}