import { useEffect, useMemo, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import jsonData from './mock/data.json'
import './App.scss'

type TabKey = 'dashboard' | 'courses' | 'tasks' | 'resources'

interface User {
  id: string
  name: string
  email: string
  role: string
  initials: string
  plan: string
  trialDaysLeft: number
  streakDays: number
}

interface Category {
  id: string
  name: string
  color: string
}

interface Lesson {
  id: string
  title: string
  minutes: number
  free: boolean
}

interface Course {
  id: string
  title: string
  categoryId: string
  teacher: string
  level: string
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
}

interface Task {
  id: string
  courseId: string
  title: string
  kind: string
  dueDate: string
  status: 'in_progress' | 'not_started' | 'submitted' | 'graded'
  priority: 'high' | 'medium' | 'low'
  submittedAt?: string
  score?: number
  feedback?: string
}

interface Resource {
  id: string
  courseId: string
  title: string
  kind: 'pdf' | 'video' | 'code' | 'link' | 'dataset'
  sizeKb?: number
  addedAt: string
  author: string
}

interface WeeklyActivity {
  label: string
  hours: number
  color: string
}

interface AppData {
  user: User
  categories: Category[]
  courses: Course[]
  tasks: Task[]
  resources: Resource[]
  weeklyActivity: WeeklyActivity[]
}

const data = jsonData as AppData

const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Обзор', icon: '📊' },
  { key: 'courses', label: 'Курсы', icon: '📚' },
  { key: 'tasks', label: 'Задачи', icon: '✅' },
  { key: 'resources', label: 'Материалы', icon: '📁' },
]

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
  }).format(date)
}

const formatCurrency = (value: number) => `${value.toLocaleString('ru-RU')} ₽`

const getTaskStatusLabel = (status: Task['status']) => {
  const labelMap: Record<Task['status'], string> = {
    in_progress: 'В работе',
    not_started: 'Не начато',
    submitted: 'На проверке',
    graded: 'Проверено',
  }

  return labelMap[status]
}

const getTaskPriorityLabel = (priority: Task['priority']) => {
  const labelMap: Record<Task['priority'], string> = {
    high: 'Высокий',
    medium: 'Средний',
    low: 'Низкий',
  }

  return labelMap[priority]
}

const getResourceIcon = (kind: Resource['kind']) => {
  const icons: Record<Resource['kind'], string> = {
    pdf: '📄',
    video: '🎥',
    code: '💻',
    link: '🔗',
    dataset: '📊',
  }

  return icons[kind]
}

const getCategoryMeta = (categoryId: string) =>
  data.categories.find((category) => category.id === categoryId) ?? {
    id: categoryId,
    name: 'Разное',
    color: 'accent',
  }

function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const navigate = useNavigate()

  // === ТЕМА ===
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('knowvio-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('knowvio-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const enrolledCourses = data.courses.filter((course) => course.enrolled)
  const completedTasks = data.tasks.filter(
    (task) => task.status === 'graded' || task.status === 'submitted',
  )
  const totalTasks = data.tasks.length

  const averageScore =
    enrolledCourses.length > 0
      ? Math.round(
          enrolledCourses.reduce((sum, course) => sum + course.averageScore, 0) /
            enrolledCourses.length,
        )
      : 0

  const tasksByStatus = {
    in_progress: data.tasks.filter((task) => task.status === 'in_progress'),
    not_started: data.tasks.filter((task) => task.status === 'not_started'),
    submitted: data.tasks.filter((task) => task.status === 'submitted'),
    graded: data.tasks.filter((task) => task.status === 'graded'),
  }

  const filteredCourses = useMemo(() => {
    return data.courses.filter((course) => {
      const matchesCategory =
        selectedCategory === 'all' || course.categoryId === selectedCategory
      const matchTitle = course.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
      const matchTeacher = course.teacher
        .toLowerCase()
        .includes(searchQuery.toLowerCase())

      return matchesCategory && (matchTitle || matchTeacher)
    })
  }, [searchQuery, selectedCategory])

  const getPageTitle = () => {
    const path = window.location.pathname
    if (path.includes('/courses')) return 'Курсы'
    if (path.includes('/tasks')) return 'Задачи'
    if (path.includes('/resources')) return 'Материалы'
    if (path.includes('/settings')) return 'Настройки'
    return 'Обзор'
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">K</span>
          <span className="brand-name">Knowvio</span>
        </div>

        <nav className="sidebar-nav">
          {tabs.map((tab) => (
            <NavLink
              key={tab.key}
              to={`/${tab.key}`}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <span className="nav-icon">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.key === 'tasks' && tasksByStatus.in_progress.length > 0 && (
                <span className="nav-badge">
                  {tasksByStatus.in_progress.length}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          {data.user.trialDaysLeft > 0 && (
            <div className="plan-card">
              <div className="plan-header">
                <span className="plan-title">
                  <span className="crown-icon">👑</span>
                  Тариф
                </span>
                <span className="plan-badge">
                  {data.user.plan === 'free' ? 'Free' : 'Pro'}
                </span>
              </div>

              <div className="plan-days">
                <span>Осталось {data.user.trialDaysLeft} дн.</span>
                <div className="plan-progress">
                  <span
                    className="plan-progress-fill"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, (data.user.trialDaysLeft / 14) * 100),
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <p className="plan-hint">
                Пробный период заканчивается, продлите доступ к курсам.
              </p>

              <button type="button" className="upgrade-btn">
                Перейти на Pro
              </button>
            </div>
          )}

          <button
            type="button"
            className={`sidebar-row ${theme === 'dark' ? 'dark-active' : ''}`}
            onClick={toggleTheme}
            aria-pressed={theme === 'dark'}
          >
            <span className="row-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span className="row-label">
              {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            </span>
            <span className="switch" aria-hidden="true">
              <span className="switch-thumb" />
            </span>
          </button>

          <button
            type="button"
            className="sidebar-row"
            onClick={() => navigate('/settings')}
          >
            <span className="row-icon">⚙️</span>
            <span className="row-label">Настройки</span>
          </button>

          <button type="button" className="sidebar-row logout">
            <span className="row-icon">↪</span>
            <span className="row-label">Выйти</span>
          </button>

          <div className="user-row">
            <div className="user-avatar">{data.user.initials}</div>
            <div className="user-meta">
              <strong>{data.user.name}</strong>
              <span>
                {data.user.plan === 'free' ? 'Бесплатный тариф' : 'Pro тариф'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <h1 className="page-title">{getPageTitle()}</h1>
            <p className="streak">🔥 {data.user.streakDays} дней подряд</p>
          </div>

          <div className="topbar-tools">
            <label className="search-box">
                <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M20 20L16.5 16.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Поиск..."
              />
            </label>
            <button type="button" className="icon-btn">
              🔔
            </button>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <DashboardPage
                tasksByStatus={tasksByStatus}
                averageScore={averageScore}
                completedTasks={completedTasks}
                totalTasks={totalTasks}
                enrolledCourses={enrolledCourses}
                tasks={data.tasks}
                weeklyActivity={data.weeklyActivity}
              />
            }
          />
          <Route
            path="/courses"
            element={
              <CoursesPage
                categories={data.categories}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                filteredCourses={filteredCourses}
              />
            }
          />
          <Route
            path="/tasks"
            element={<TasksPage tasksByStatus={tasksByStatus} />}
          />
          <Route
            path="/resources"
            element={<ResourcesPage resources={data.resources} />}
          />
          <Route
            path="/settings"
            element={
              <SettingsPage
                theme={theme}
                toggleTheme={toggleTheme}
                user={data.user}
              />
            }
          />
        </Routes>
      </main>
    </div>
  )
}

interface DashboardPageProps {
  tasksByStatus: Record<string, Task[]>
  averageScore: number
  completedTasks: Task[]
  totalTasks: number
  enrolledCourses: Course[]
  tasks: Task[]
  weeklyActivity: WeeklyActivity[]
}

function DashboardPage({
  tasksByStatus,
  averageScore,
  completedTasks,
  totalTasks,
  enrolledCourses,
  tasks,
  weeklyActivity,
}: DashboardPageProps) {
  const upcomingTasks = [...tasks]
    .filter((task) => task.status === 'in_progress' || task.status === 'not_started')
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    )
    .slice(0, 5)

  return (
    <div className="dashboard-page">
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Курсов в обучении</div>
          <div className="stat-value">{enrolledCourses.length}</div>
          <div className="stat-subtitle">из {data.courses.length} доступных</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Средний балл</div>
          <div className="stat-value">{averageScore}%</div>
          <div className="stat-subtitle">по завершённым заданиям</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Выполнено задач</div>
          <div className="stat-value">
            {completedTasks.length}/{totalTasks}
          </div>
          <div className="stat-subtitle">за всё время</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Активных задач</div>
          <div className="stat-value">{tasksByStatus.in_progress.length}</div>
          <div className="stat-subtitle">требуют внимания</div>
        </div>
      </section>

      <section className="panel">
        <h2>Активность за неделю</h2>
        <div className="activity-chart">
          {weeklyActivity.map((item) => (
            <div className="activity-column" key={item.label}>
              <div className="activity-bar-wrap">
                <div
                  className="activity-bar"
                  style={{
                    height: `${(item.hours / 7) * 100}%`,
                    background: `var(--app-${item.color}, var(--app-accent))`,
                  }}
                />
              </div>
              <div className="activity-data">
                <span>{item.hours}ч</span>
                <small>{item.label}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Ближайшие задачи</h2>
        <div className="task-list">
          {upcomingTasks.map((task) => {
            const course = data.courses.find((item) => item.id === task.courseId)
            return (
              <div key={task.id} className="task-item">
                <div className={`task-priority priority-${task.priority}`} />
                <div className="task-copy">
                  <strong>{task.title}</strong>
                  <div className="task-submeta">
                    <span>{course?.title}</span>
                    <span>до {formatDate(task.dueDate)}</span>
                  </div>
                </div>
                <span className={`task-badge status-${task.status}`}>
                  {getTaskStatusLabel(task.status)}
                </span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

interface CoursesPageProps {
  categories: Category[]
  selectedCategory: string
  setSelectedCategory: (value: string) => void
  filteredCourses: Course[]
}

function CoursesPage({
  categories,
  selectedCategory,
  setSelectedCategory,
  filteredCourses,
}: CoursesPageProps) {
  return (
    <div className="courses-page">
      <div className="filters">
        <button
          type="button"
          className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          Все
        </button>

        {categories.map((category) => (
          <button
            type="button"
            key={category.id}
            className={`filter-btn ${
              selectedCategory === category.id ? 'active' : ''
            }`}
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="course-grid">
        {filteredCourses.map((course) => {
          const category = getCategoryMeta(course.categoryId)
          const progress = course.lessonsTotal
            ? (course.lessonsDone / course.lessonsTotal) * 100
            : 0

          return (
            <article key={course.id} className="course-card">
              <span className={`course-category category-${category.color}`}>
                {category.name}
              </span>

              <h3>{course.title}</h3>
              <p className="course-desc">{course.description}</p>

              <div className="meta-list">
                <div className="meta-row">
                  <span>Преподаватель</span>
                  <strong>{course.teacher}</strong>
                </div>
                <div className="meta-row">
                  <span>Длительность</span>
                  <strong>{course.hours} часов</strong>
                </div>
                <div className="meta-row">
                  <span>Рейтинг</span>
                  <strong>
                    ⭐ {course.rating} ({course.reviews})
                  </strong>
                </div>
              </div>

              <div className="tag-list">
                {course.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>

              {course.enrolled ? (
                <div className="progress-block">
                  <div className="progress-head">
                    <span>
                      Прогресс: {course.lessonsDone}/{course.lessonsTotal} уроков
                    </span>
                    <strong>{Math.round(progress)}%</strong>
                  </div>
                  <div className="progress-bar">
                    <span style={{ width: `${progress}%` }} />
                  </div>

                  {course.averageScore > 0 && (
                    <div className="score-pill">
                      Средний балл: {course.averageScore}%
                    </div>
                  )}
                </div>
              ) : (
                <div className="course-footer">
                  <div className="price-block">
                    {course.price === 0 ? (
                      <span className="free-price">Бесплатно</span>
                    ) : (
                      <>
                        <span className="current-price">
                          {formatCurrency(course.price)}
                        </span>
                        {course.oldPrice && (
                          <span className="old-price">
                            {formatCurrency(course.oldPrice)}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <button type="button" className="enroll-btn">
                    Записаться
                  </button>
                </div>
              )}

              {course.seatsLeft > 0 && course.seatsLeft <= 5 && (
                <div className="warning-box">Осталось {course.seatsLeft} мест</div>
              )}

              {course.seatsLeft === 0 && (
                <div className="warning-box danger">Мест нет</div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}

interface TasksPageProps {
  tasksByStatus: Record<string, Task[]>
}

function TasksPage({ tasksByStatus }: TasksPageProps) {
  const columns = [
    { key: 'in_progress', title: 'В работе' },
    { key: 'not_started', title: 'Не начато' },
    { key: 'submitted', title: 'На проверке' },
    { key: 'graded', title: 'Проверено' },
  ]

  return (
    <div className="task-board">
      {columns.map((column) => (
        <div className="task-column" key={column.key}>
          <h3>
            {column.title} ({tasksByStatus[column.key].length})
          </h3>

          {tasksByStatus[column.key].map((task) => {
            const course = data.courses.find((item) => item.id === task.courseId)

            return (
              <div
                className={`task-card ${column.key === 'graded' ? 'graded' : ''}`}
                key={task.id}
              >
                <div className="task-card-top">
                  <span className={`task-kind kind-${task.kind}`}>{task.kind}</span>

                  {column.key === 'graded' ? (
                    <span
                      className={`score-badge ${
                        task.score && task.score >= 80 ? 'good' : 'average'
                      }`}
                    >
                      {task.score ?? 0}%
                    </span>
                  ) : (
                    <span className={`priority-badge priority-${task.priority}`}>
                      {getTaskPriorityLabel(task.priority)}
                    </span>
                  )}
                </div>

                <h4>{task.title}</h4>
                <p className="course-name">{course?.title}</p>

                {column.key === 'graded' ? (
                  task.feedback && (
                    <div className="feedback">
                      <strong>Отзыв:</strong> {task.feedback}
                    </div>
                  )
                ) : (
                  <div className="task-date">
                    {column.key === 'submitted'
                      ? `Отправлено: ${task.submittedAt ?? '-'}`
                      : `Срок: ${formatDate(task.dueDate)}`}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

interface ResourcesPageProps {
  resources: Resource[]
}

function ResourcesPage({ resources }: ResourcesPageProps) {
  return (
    <div className="resources-page">
      {resources.map((resource) => {
        const course = data.courses.find((item) => item.id === resource.courseId)

        return (
          <div key={resource.id} className="resource-item">
            <span className="resource-icon">
              {getResourceIcon(resource.kind)}
            </span>

            <div className="resource-copy">
              <strong>{resource.title}</strong>
              <p>
                {course?.title} • {resource.author}
              </p>
            </div>

            <div className="resource-meta">
              <span className="kind-tag">{resource.kind.toUpperCase()}</span>
              {resource.sizeKb && (
                <span>{(resource.sizeKb / 1024).toFixed(1)} MB</span>
              )}
              <span>{formatDate(resource.addedAt)}</span>
            </div>

            <button type="button" className="download-btn">
              Скачать
            </button>
          </div>
        )
      })}
    </div>
  )
}

// === СТРАНИЦА НАСТРОЕК ===
interface SettingsPageProps {
  theme: 'light' | 'dark'
  toggleTheme: () => void
  user: User
}

function SettingsPage({ theme, toggleTheme, user }: SettingsPageProps) {
  const courses = data.courses
  const tasks = data.tasks
  const resources = data.resources

  const openCourses = courses.filter((c) => c.enrolled)

  const lessonsDone = openCourses.reduce((sum, c) => sum + c.lessonsDone, 0)
  const lessonsTotal = openCourses.reduce((sum, c) => sum + c.lessonsTotal, 0)

  const progressPercent =
    lessonsTotal > 0 ? Math.round((lessonsDone / lessonsTotal) * 100) : 0

  const scored = openCourses.filter((c) => c.averageScore > 0)
  const avgScore =
    scored.length > 0
      ? Math.round(
          scored.reduce((sum, c) => sum + c.averageScore, 0) / scored.length,
        )
      : 0

  const [emailDigest, setEmailDigest] = useState(true)
  const [deadlineReminders, setDeadlineReminders] = useState(false)

  const handleReset = () => {
    const confirmed = window.confirm(
      'Сбросить демо-данные? Все изменения в localStorage будут удалены.',
    )
    if (!confirmed) return

    localStorage.removeItem('knowvio.db')
    window.location.reload()
  }

  return (
    <div className="settings-page">
      <section className="welcome-banner">
        <h2>С возвращением, {user.name.split(' ')[0]}!</h2>
        <p>Сегодня пройдено 3 урока, продолжайте в том же темпе.</p>
      </section>

      <header className="settings-header">
        <h1>Настройки</h1>
        <p>Профиль, оповещения и демонстрационные данные.</p>
      </header>
    <div className="panels">
      <section className="panel settings-card">
        <h2>Профиль</h2>

        <div className="profile-row">
          <div className="profile-avatar">{user.initials}</div>
          <div className="profile-info">
            <div className="profile-plan">
              Пробный период, {user.trialDaysLeft} дн.
            </div>
            <strong className="profile-name">{user.name}</strong>
            <span className="profile-email">{user.email}</span>
          </div>
        </div>
      </section>

      <section className="panel settings-card">
        <h2>Оповещения</h2>

        <div className="settings-row">
          <div className="settings-row-text">
            <strong>Дайджест на почту</strong>
            <span>Раз в неделю: прогресс и ближайшие сроки.</span>
          </div>
          <button
            type="button"
            className={`switch ${emailDigest ? 'on' : ''}`}
            onClick={() => setEmailDigest((v) => !v)}
            aria-pressed={emailDigest}
          >
            <span className="switch-thumb" />
          </button>
        </div>

        <div className="settings-row">
          <div className="settings-row-text">
            <strong>Напоминания о сроках</strong>
            <span>За два дня до сдачи задания.</span>
          </div>
          <button
            type="button"
            className={`switch ${deadlineReminders ? 'on' : ''}`}
            onClick={() => setDeadlineReminders((v) => !v)}
            aria-pressed={deadlineReminders}
          >
            <span className="switch-thumb" />
          </button>
        </div>

        <div className="settings-row">
          <div className="settings-row-text">
            <strong>Тёмная тема</strong>
            <span>Тот же переключатель, что и в боковом меню.</span>
          </div>
          <button
            type="button"
            className={`switch ${theme === 'dark' ? 'on' : ''}`}
            onClick={toggleTheme}
            aria-pressed={theme === 'dark'}
          >
            <span className="switch-thumb" />
          </button>
        </div>
      </section>

      <section className="panel settings-card">
        <h2>Пройдено по открытым курсам</h2>

        <div className="progress-big">
          <span className="progress-big-value">{progressPercent}%</span>
          <div className="progress-big-bar">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="mini-stats">
          <div className="mini-stat">
            <span>Курсов открыто</span>
            <strong>{openCourses.length}</strong>
          </div>
          <div className="mini-stat">
            <span>Уроков пройдено</span>
            <strong>
              {lessonsDone} из {lessonsTotal}
            </strong>
          </div>
          <div className="mini-stat">
            <span>Средний балл</span>
            <strong>{avgScore}%</strong>
          </div>
          <div className="mini-stat">
            <span>Серия занятий</span>
            <strong>{user.streakDays} дн.</strong>
          </div>
        </div>
      </section>

      <section className="panel settings-card">
        <h2>Данные</h2>

        <p className="data-note">
          Демо-режим: всё хранится в браузере. Изменения сохраняются в
          localStorage под ключом <code>knowvio.db</code>. Сброс вернёт исходный
          набор курсов, заданий и уведомлений.
        </p>

        <div className="mini-stats">
          <div className="mini-stat">
            <span>Курсов</span>
            <strong>{courses.length}</strong>
          </div>
          <div className="mini-stat">
            <span>Заданий</span>
            <strong>{tasks.length}</strong>
          </div>
          <div className="mini-stat">
            <span>Материалов</span>
            <strong>{resources.length}</strong>
          </div>
        </div>

        <button type="button" className="reset-btn" onClick={handleReset}>
          Сбросить демо-данные
        </button>
      </section>
      </div>
    </div>
  )
}

export default App