'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'

type ViewKey = 'home' | 'missions' | 'rewards' | 'family'

interface Child {
  id: string
  name: string
  avatar: string
  coins: number
  level: number
  xp: number
}

interface Mission {
  id: string
  title: string
  category: string
  coins: number
  xp: number
  icon: string
  description: string
}

interface Reward {
  id: string
  title: string
  cost: number
  icon: string
  description: string
}

interface PendingValidation {
  id: string
  childId: string
  missionId: string
  createdAt: string
}

interface FamilyState {
  familyName: string
  children: Child[]
  missions: Mission[]
  rewards: Reward[]
  validations: PendingValidation[]
  completedToday: Record<string, boolean>
}

const STORAGE_KEY = 'tecuida:family-gamification:v1'

const INITIAL_STATE: FamilyState = {
  familyName: 'Mi familia',
  children: [
    { id: 'child-1', name: 'Alex', avatar: 'N', coins: 50, level: 1, xp: 20 },
  ],
  missions: [
    {
      id: 'mission-bed',
      title: 'Hacer la cama',
      category: 'Orden',
      coins: 10,
      xp: 12,
      icon: 'M4.5 10.5h15m-15 0V7.875C4.5 6.84 5.34 6 6.375 6h11.25C18.66 6 19.5 6.84 19.5 7.875V18m-15-7.5V18m0 0H3m1.5 0H21m-1.5 0v-7.5',
      description: 'Dejar la cama lista antes de empezar el dia.',
    },
    {
      id: 'mission-backpack',
      title: 'Preparar mochila',
      category: 'Autonomia',
      coins: 15,
      xp: 16,
      icon: 'M8.25 7.5V6A3.75 3.75 0 0 1 12 2.25 3.75 3.75 0 0 1 15.75 6v1.5m-9 0h10.5A2.25 2.25 0 0 1 19.5 9.75v9A2.25 2.25 0 0 1 17.25 21H6.75A2.25 2.25 0 0 1 4.5 18.75v-9A2.25 2.25 0 0 1 6.75 7.5Z',
      description: 'Revisar tareas, botella y material del dia siguiente.',
    },
    {
      id: 'mission-kindness',
      title: 'Gesto amable',
      category: 'Convivencia',
      coins: 12,
      xp: 14,
      icon: 'M20.25 8.75c0 5.25-8.25 10-8.25 10s-8.25-4.75-8.25-10A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8.25 2.75Z',
      description: 'Ayudar en casa o tener un detalle con otra persona.',
    },
  ],
  rewards: [
    {
      id: 'reward-game',
      title: 'Tiempo extra de juego',
      cost: 50,
      icon: 'M6.75 12h3m-1.5-1.5v3m6-1.5h.008v.008H14.25V12Zm2.25 0h.008v.008H16.5V12ZM7.5 18.75h9A4.5 4.5 0 0 0 21 14.25v-1.5A4.5 4.5 0 0 0 16.5 8.25h-9A4.5 4.5 0 0 0 3 12.75v1.5a4.5 4.5 0 0 0 4.5 4.5Z',
      description: '30 minutos extra de ocio digital pactado.',
    },
    {
      id: 'reward-plan',
      title: 'Plan especial',
      cost: 80,
      icon: 'M6.75 3v2.25M17.25 3v2.25M3.75 8.25h16.5M5.25 5.25h13.5A1.5 1.5 0 0 1 20.25 6.75v12A1.5 1.5 0 0 1 18.75 20.25H5.25A1.5 1.5 0 0 1 3.75 18.75v-12A1.5 1.5 0 0 1 5.25 5.25Z',
      description: 'Elegir una actividad familiar del fin de semana.',
    },
  ],
  validations: [],
  completedToday: {},
}

function IconPath({ path }: { path: string }) {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  )
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? ({ ...INITIAL_STATE, ...JSON.parse(raw) } as FamilyState) : INITIAL_STATE
  } catch {
    return INITIAL_STATE
  }
}

function saveState(value: FamilyState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

function todayKey() {
  return new Date().toISOString().split('T')[0] || 'today'
}

export default function FamilyGamificationClient() {
  const [state, setState] = useState<FamilyState>(INITIAL_STATE)
  const [hydrated, setHydrated] = useState(false)
  const [view, setView] = useState<ViewKey>('home')
  const [activeChildId, setActiveChildId] = useState(INITIAL_STATE.children[0]?.id || '')
  const [newChildName, setNewChildName] = useState('')

  useEffect(() => {
    const saved = loadState()
    setState(saved)
    setActiveChildId(saved.children[0]?.id || '')
    setHydrated(true)
  }, [])

  const activeChild = state.children.find((child) => child.id === activeChildId) || state.children[0]
  const dayKey = todayKey()
  const completedCount = state.missions.filter((mission) => state.completedToday[`${dayKey}:${activeChild?.id}:${mission.id}`]).length
  const progressPercent = state.missions.length ? Math.round((completedCount / state.missions.length) * 100) : 0
  const pendingForChild = useMemo(
    () => state.validations.filter((item) => item.childId === activeChild?.id),
    [activeChild?.id, state.validations],
  )

  function update(next: FamilyState) {
    setState(next)
    saveState(next)
  }

  function requestValidation(missionId: string) {
    if (!activeChild) return
    const id = `${activeChild.id}:${missionId}:${dayKey}`
    if (state.validations.some((item) => item.id === id)) return
    update({
      ...state,
      validations: [...state.validations, { id, childId: activeChild.id, missionId, createdAt: new Date().toISOString() }],
    })
  }

  function approveValidation(validation: PendingValidation) {
    const mission = state.missions.find((item) => item.id === validation.missionId)
    if (!mission) return
    update({
      ...state,
      children: state.children.map((child) =>
        child.id === validation.childId
          ? {
              ...child,
              coins: child.coins + mission.coins,
              xp: child.xp + mission.xp,
              level: Math.max(child.level, Math.floor((child.xp + mission.xp) / 100) + 1),
            }
          : child,
      ),
      validations: state.validations.filter((item) => item.id !== validation.id),
      completedToday: { ...state.completedToday, [`${dayKey}:${validation.childId}:${mission.id}`]: true },
    })
  }

  function redeemReward(reward: Reward) {
    if (!activeChild || activeChild.coins < reward.cost) return
    update({
      ...state,
      children: state.children.map((child) =>
        child.id === activeChild.id ? { ...child, coins: child.coins - reward.cost } : child,
      ),
    })
  }

  function addChild() {
    const name = newChildName.trim()
    if (!name) return
    const child: Child = {
      id: `child-${Date.now()}`,
      name,
      avatar: name.slice(0, 1).toUpperCase(),
      coins: 0,
      level: 1,
      xp: 0,
    }
    const next = { ...state, children: [...state.children, child] }
    update(next)
    setActiveChildId(child.id)
    setNewChildName('')
  }

  const navItems: Array<{ key: ViewKey; label: string; path: string }> = [
    { key: 'home', label: 'Inicio', path: 'M3.75 12 12 4.5 20.25 12M5.25 10.5v8.25h13.5V10.5' },
    { key: 'missions', label: 'Misiones', path: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
    { key: 'rewards', label: 'Premios', path: 'M12 3.75 14.25 8.3l5.02.73-3.63 3.54.86 5-4.5-2.36-4.5 2.36.86-5-3.63-3.54 5.02-.73L12 3.75Z' },
    { key: 'family', label: 'Familia', path: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 12.75 0Zm-6.375-9.375a3.375 3.375 0 1 0 0-6.75 3.375 3.375 0 0 0 0 6.75Z' },
  ]

  if (!hydrated) {
    return <div className="grid min-h-screen place-items-center bg-[#f7f4ff] text-sm text-slate-500">Cargando Economía Familiar...</div>
  }

  return (
    <main className="min-h-screen bg-[#f7f4ff] text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <a href="/dashboard/aplicaciones" className="grid h-10 w-10 place-items-center rounded-full border border-violet-200 bg-white text-violet-700 shadow-sm" aria-label="Volver">
            <IconPath path="M15.75 19.5 8.25 12l7.5-7.5" />
          </a>
          <div className="flex min-w-0 items-center gap-3">
            <Image src="/family-gamification-icon-192.png" alt="" width={44} height={44} className="rounded-2xl" priority />
            <div className="min-w-0">
              <h1 className="truncate text-base font-black sm:text-lg">Economía Familiar</h1>
              <p className="truncate text-xs font-semibold uppercase text-violet-700">Misiones, monedas y premios en casa</p>
            </div>
          </div>
          <div className="rounded-full bg-white px-4 py-2 text-sm font-black text-amber-600 shadow-sm">{activeChild?.coins ?? 0} monedas</div>
        </header>

        <div className="mt-6 grid flex-1 gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-violet-100">
            <div className="rounded-3xl bg-violet-600 p-5 text-white">
              <p className="text-xs font-bold uppercase text-violet-100">{state.familyName}</p>
              <strong className="mt-2 block text-3xl">{activeChild?.name}</strong>
              <span className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-bold">
                Nivel {activeChild?.level ?? 1}
              </span>
            </div>
            <nav className="mt-4 grid gap-2" aria-label="Secciones">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setView(item.key)}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${view === item.key ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <IconPath path={item.path} />
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-violet-100 sm:p-7">
            {view === 'home' && (
              <div className="grid gap-6">
                <div className="rounded-[28px] bg-slate-950 p-6 text-white">
                  <p className="text-sm font-bold uppercase text-cyan-200">Progreso de hoy</p>
                  <h2 className="mt-2 text-3xl font-black sm:text-5xl">{progressPercent}%</h2>
                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/15">
                    <span className="block h-full rounded-full bg-cyan-300" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <p className="mt-3 text-sm text-slate-300">{completedCount} de {state.missions.length} misiones validadas</p>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {state.missions.slice(0, 3).map((mission) => (
                    <MissionCard key={mission.id} mission={mission} completed={!!state.completedToday[`${dayKey}:${activeChild?.id}:${mission.id}`]} pending={state.validations.some((item) => item.id === `${activeChild?.id}:${mission.id}:${dayKey}`)} onRequest={() => requestValidation(mission.id)} />
                  ))}
                </div>
              </div>
            )}

            {view === 'missions' && (
              <div className="grid gap-4">
                <SectionTitle title="Misiones de hoy" subtitle="El hijo marca una misión y el adulto la valida." />
                {state.missions.map((mission) => (
                  <MissionCard key={mission.id} mission={mission} completed={!!state.completedToday[`${dayKey}:${activeChild?.id}:${mission.id}`]} pending={state.validations.some((item) => item.id === `${activeChild?.id}:${mission.id}:${dayKey}`)} onRequest={() => requestValidation(mission.id)} />
                ))}
              </div>
            )}

            {view === 'rewards' && (
              <div className="grid gap-4">
                <SectionTitle title="Premios" subtitle="Canjea monedas por recompensas pactadas en familia." />
                <div className="grid gap-4 md:grid-cols-2">
                  {state.rewards.map((reward) => (
                    <button key={reward.id} type="button" onClick={() => redeemReward(reward)} disabled={!activeChild || activeChild.coins < reward.cost} className="rounded-3xl border border-violet-100 p-5 text-left transition hover:border-violet-300 disabled:opacity-50">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-50 text-amber-600"><IconPath path={reward.icon} /></div>
                      <h3 className="mt-4 text-lg font-black">{reward.title}</h3>
                      <p className="mt-2 text-sm text-slate-500">{reward.description}</p>
                      <strong className="mt-4 block text-sm text-violet-700">{reward.cost} monedas</strong>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {view === 'family' && (
              <div className="grid gap-6">
                <SectionTitle title="Familia" subtitle="Gestiona perfiles y valida misiones pendientes." />
                <div className="grid gap-3 sm:grid-cols-2">
                  {state.children.map((child) => (
                    <button key={child.id} type="button" onClick={() => setActiveChildId(child.id)} className={`rounded-3xl border p-4 text-left ${activeChildId === child.id ? 'border-violet-500 bg-violet-50' : 'border-slate-200'}`}>
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-600 font-black text-white">{child.avatar}</span>
                      <strong className="mt-3 block">{child.name}</strong>
                      <span className="text-sm text-slate-500">Nivel {child.level} · {child.coins} monedas</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={newChildName} onChange={(event) => setNewChildName(event.target.value)} placeholder="Nombre del hijo/a" className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-500" />
                  <button type="button" onClick={addChild} className="rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white">Añadir</button>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <h3 className="font-black">Pendientes de validar</h3>
                  <div className="mt-3 grid gap-2">
                    {pendingForChild.length ? pendingForChild.map((validation) => {
                      const mission = state.missions.find((item) => item.id === validation.missionId)
                      return (
                        <button key={validation.id} type="button" onClick={() => approveValidation(validation)} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-left text-sm shadow-sm">
                          <span>{mission?.title || 'Mision'}</span>
                          <strong className="text-violet-700">Validar</strong>
                        </button>
                      )
                    }) : <p className="text-sm text-slate-500">No hay misiones pendientes.</p>}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  )
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-2xl font-black text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  )
}

function MissionCard({ mission, completed, pending, onRequest }: { mission: Mission; completed: boolean; pending: boolean; onRequest: () => void }) {
  return (
    <button
      type="button"
      onClick={onRequest}
      disabled={completed || pending}
      className="rounded-3xl border border-violet-100 p-5 text-left transition hover:border-violet-300 disabled:cursor-default disabled:opacity-80"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-50 text-violet-700"><IconPath path={mission.icon} /></div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">+{mission.coins}</span>
      </div>
      <p className="mt-4 text-xs font-bold uppercase text-violet-600">{mission.category}</p>
      <h3 className="mt-1 text-lg font-black">{mission.title}</h3>
      <p className="mt-2 text-sm text-slate-500">{mission.description}</p>
      <span className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
        {completed ? 'Validada hoy' : pending ? 'Pendiente de adulto' : 'Pedir validacion'}
      </span>
    </button>
  )
}
