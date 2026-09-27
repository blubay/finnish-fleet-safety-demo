import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Anchor,
  Building2,
  Database,
  Gauge,
  Info,
  Menu,
  Search,
  Ship,
  ShieldCheck,
  X,
} from 'lucide-react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { supabase } from './lib/supabase'
import './App.css'

type FleetOverview = {
  reference_quarter: string
  finnish_registered_vessels: number | string
  traficom_registered_vessels: number | string
  aland_registered_vessels: number | string
  source_name: string | null
  scope_note: string | null
}

type PscQuality = {
  cohort_inspection_count: number
  finnish_flag_inspection_count: number
  non_finnish_flag_inspection_count: number
  cohort_vessel_count: number
  finnish_flag_vessel_count: number
  finnish_flag_deficiency_count: number
  finnish_flag_detention_count: number
  first_inspection_date: string | null
  latest_inspection_date: string | null
}

type Vessel = {
  vessel_key: string
  fleet_scope: string
  current_registry_confirmed: boolean | null
  registration_authority: string | null
  registration_authority_evidence?: string | null
  traficom_alus_id?: string | number | null
  aland_source_key?: string | null
  imo: string | null
  name: string | null
  latest_observed_name?: string | null
  vessel_type?: string | null
  vessel_type_name?: string | null
  home_port?: string | null
  build_year?: string | number | null
  gross_tonnage?: string | number | null
  class_society: string | null
  class_evidence_type?: string | null
  current_class_confirmed?: boolean | null
  current_iacs_status?: string | null
  psc_inspection_count?: number | null
  deficiency_count?: number | null
  detention_count?: number | null
  latest_psc_inspection_date?: string | null
  latest_psc_flag_code?: string | null
  change_signal_count?: number | null
}

type Society = {
  class_society: string
  class_evidence_vessels: number
  current_iacs_confirmed_vessels: number
  official_2025_only_vessels: number
  traficom_class_evidence_vessels: number
  aland_2025_class_evidence_vessels: number
  finnish_flag_psc_inspections: number
  finnish_flag_psc_vessels: number
  finnish_flag_deficiencies: number
  finnish_flag_deficiencies_per_inspection: number | string | null
  finnish_flag_zero_deficiency_rate_pct: number | string | null
  finnish_flag_detentions: number
  finnish_flag_detention_rate_pct: number | string | null
}

type PscInspection = {
  inspection_id: number
  vessel_key: string
  fleet_scope: string
  imo: string | null
  reference_vessel_name?: string | null
  inspection_ship_name: string | null
  inspection_flag_code: string | null
  is_finnish_flag_inspection: boolean
  date_of_first_visit: string | null
  place_of_inspection: string | null
  reporting_authority: string | null
  inspection_class_society: string | null
  class_assignment_status: string | null
  deficiency_count: number
  detained: boolean
}

type ChangeRow = Record<string, unknown>

type DashboardData = {
  overview: FleetOverview | null
  pscQuality: PscQuality | null
  vessels: Vessel[]
  societies: Society[]
  inspections: PscInspection[]
  changes: ChangeRow[]
}

const EMPTY_DATA: DashboardData = {
  overview: null,
  pscQuality: null,
  vessels: [],
  societies: [],
  inspections: [],
  changes: [],
}

const numberValue = (value: number | string | null | undefined) =>
  value === null || value === undefined ? 0 : Number(value)

const formatNumber = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('fi-FI').format(numberValue(value))

const formatDate = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat('fi-FI', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(`${value}T00:00:00`))
    : '—'

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string
  value: string | number
  detail?: string
  icon: React.ReactNode
}) {
  return (
    <div className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div>
        <div className="metric-label">{label}</div>
        <div className="metric-value">{value}</div>
        {detail && <div className="metric-detail">{detail}</div>}
      </div>
    </div>
  )
}

function Loading() {
  return (
    <div className="state-panel">
      <div className="spinner" />
      <span>Loading fleet data…</span>
    </div>
  )
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="state-panel error-panel">
      <AlertTriangle size={20} />
      <div>
        <strong>Could not load dashboard data</strong>
        <div>{message}</div>
      </div>
    </div>
  )
}

function OverviewPage({ data }: { data: DashboardData }) {
  const traficom = data.vessels.filter(
    (v) => v.fleet_scope === 'CURRENT_TRAFICOM_REGISTER',
  ).length

  const aland = data.vessels.filter(
    (v) => v.fleet_scope === 'ALAND_2025_EVIDENCE',
  ).length

  return (
    <>
      <PageHeader
        eyebrow="Finnish fleet"
        title="Overview"
        description="Official fleet totals, vessel-level evidence, classification and Paris MoU PSC observations."
      />

      <div className="notice">
        <Database size={17} />
        <div>
          <strong>Different scopes are intentionally kept separate.</strong>{' '}
          The official current whole-Finland fleet total comes from StatFin.
          Vessel-level Åland data is a 2025 evidence snapshot, not a current
          Åland register.
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard
          label="Finnish registered vessels"
          value={formatNumber(data.overview?.finnish_registered_vessels)}
          detail={`StatFin ${data.overview?.reference_quarter ?? ''}`}
          icon={<Ship size={22} />}
        />
        <MetricCard
          label="Traficom vessel rows"
          value={formatNumber(traficom)}
          detail="Current public Traficom register"
          icon={<Anchor size={22} />}
        />
        <MetricCard
          label="Åland vessel evidence"
          value={formatNumber(aland)}
          detail="Official 2025 publication snapshot"
          icon={<Database size={22} />}
        />
        <MetricCard
          label="Finnish-flag PSC inspections"
          value={formatNumber(data.pscQuality?.finnish_flag_inspection_count)}
          detail={`${formatDate(data.pscQuality?.first_inspection_date)} – ${formatDate(data.pscQuality?.latest_inspection_date)}`}
          icon={<ShieldCheck size={22} />}
        />
        <MetricCard
          label="PSC deficiencies"
          value={formatNumber(data.pscQuality?.finnish_flag_deficiency_count)}
          detail="Finnish-flag inspections"
          icon={<Activity size={22} />}
        />
        <MetricCard
          label="PSC detentions"
          value={formatNumber(data.pscQuality?.finnish_flag_detention_count)}
          detail="Finnish-flag inspections"
          icon={<AlertTriangle size={22} />}
        />
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Classification societies</h2>
            <p>
              Portfolio evidence and PSC results based on class certificate at
              inspection time.
            </p>
          </div>
          <NavLink className="text-link" to="/classification">
            View classification →
          </NavLink>
        </div>

        <div className="society-grid">
          {data.societies
            .filter((s) => s.class_evidence_vessels > 0)
            .sort(
              (a, b) => b.class_evidence_vessels - a.class_evidence_vessels,
            )
            .map((society) => (
              <div className="society-mini" key={society.class_society}>
                <div className="society-name">{society.class_society}</div>
                <strong>{society.class_evidence_vessels}</strong>
                <span>vessels with class evidence</span>
                <div className="mini-row">
                  <span>Current IACS</span>
                  <b>{society.current_iacs_confirmed_vessels}</b>
                </div>
                <div className="mini-row">
                  <span>FI PSC inspections</span>
                  <b>{society.finnish_flag_psc_inspections}</b>
                </div>
              </div>
            ))}
        </div>
      </section>
    </>
  )
}

function FleetPage({ vessels }: { vessels: Vessel[] }) {
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState('ALL')
  const [classSociety, setClassSociety] = useState('ALL')
  const [selected, setSelected] = useState<Vessel | null>(null)

  const societies = useMemo(
    () =>
      Array.from(
        new Set(
          vessels
            .map((v) => v.class_society)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    [vessels],
  )

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()

    return vessels.filter((vessel) => {
      const matchesSearch =
        !needle ||
        (vessel.name ?? '').toLowerCase().includes(needle) ||
        (vessel.latest_observed_name ?? '').toLowerCase().includes(needle) ||
        (vessel.imo ?? '').toLowerCase().includes(needle)

      const matchesScope =
        scope === 'ALL' || vessel.fleet_scope === scope

      const matchesClass =
        classSociety === 'ALL' ||
        (classSociety === 'NONE'
          ? !vessel.class_society
          : vessel.class_society === classSociety)

      return matchesSearch && matchesScope && matchesClass
    })
  }, [vessels, search, scope, classSociety])

  return (
    <>
      <PageHeader
        eyebrow="Vessel evidence"
        title="Fleet"
        description="Search and inspect the combined Traficom current-register and Åland 2025 evidence cohorts."
      />

      <div className="toolbar">
        <label className="search-box">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search vessel name or IMO…"
          />
        </label>

        <select value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="ALL">All scopes</option>
          <option value="CURRENT_TRAFICOM_REGISTER">Traficom current</option>
          <option value="ALAND_2025_EVIDENCE">Åland 2025 evidence</option>
        </select>

        <select
          value={classSociety}
          onChange={(e) => setClassSociety(e.target.value)}
        >
          <option value="ALL">All class evidence</option>
          <option value="NONE">No class evidence</option>
          {societies.map((society) => (
            <option value={society} key={society}>
              {society}
            </option>
          ))}
        </select>

        <div className="toolbar-count">
          {formatNumber(filtered.length)} / {formatNumber(vessels.length)}
        </div>
      </div>

      <div className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Vessel</th>
                <th>IMO</th>
                <th>Scope</th>
                <th>Class</th>
                <th>PSC</th>
                <th>Def.</th>
                <th>Latest PSC</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((vessel) => (
                <tr
                  key={vessel.vessel_key}
                  className="clickable-row"
                  onClick={() => setSelected(vessel)}
                >
                  <td>
                    <strong>{vessel.name || 'Unnamed vessel'}</strong>
                    {vessel.latest_observed_name &&
                      vessel.latest_observed_name !== vessel.name && (
                        <small>
                          Latest observed: {vessel.latest_observed_name}
                        </small>
                      )}
                  </td>
                  <td className="mono">{vessel.imo || '—'}</td>
                  <td>
                    <ScopeBadge scope={vessel.fleet_scope} />
                  </td>
                  <td>
                    {vessel.class_society ? (
                      <span className="class-badge">
                        {vessel.class_society}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{vessel.psc_inspection_count ?? 0}</td>
                  <td>{vessel.deficiency_count ?? 0}</td>
                  <td>{formatDate(vessel.latest_psc_inspection_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="drawer-backdrop" onClick={() => setSelected(null)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <button
              className="icon-button drawer-close"
              onClick={() => setSelected(null)}
              aria-label="Close vessel details"
            >
              <X size={20} />
            </button>

            <div className="drawer-icon">
              <Ship size={30} />
            </div>
            <h2>{selected.name || 'Unnamed vessel'}</h2>
            <div className="drawer-imo">
              IMO {selected.imo || 'not verified'}
            </div>

            <div className="detail-grid">
              <Detail label="Scope">
                <ScopeBadge scope={selected.fleet_scope} />
              </Detail>
              <Detail label="Registry authority">
                {selected.registration_authority || '—'}
              </Detail>
              <Detail label="Current registry confirmed">
                {selected.current_registry_confirmed === true
                  ? 'Yes'
                  : selected.current_registry_confirmed === false
                    ? 'No'
                    : 'Not established'}
              </Detail>
              <Detail label="Home port">
                {selected.home_port || '—'}
              </Detail>
              <Detail label="Build year">
                {selected.build_year || '—'}
              </Detail>
              <Detail label="Gross tonnage">
                {selected.gross_tonnage || '—'}
              </Detail>
              <Detail label="Class society">
                {selected.class_society || 'No public class evidence'}
              </Detail>
              <Detail label="Current IACS status">
                {selected.current_iacs_status || '—'}
              </Detail>
              <Detail label="PSC inspections">
                {selected.psc_inspection_count ?? 0}
              </Detail>
              <Detail label="Deficiencies">
                {selected.deficiency_count ?? 0}
              </Detail>
              <Detail label="Detentions">
                {selected.detention_count ?? 0}
              </Detail>
              <Detail label="Change signals">
                {selected.change_signal_count ?? 'Not evaluated'}
              </Detail>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

function ClassificationPage({ societies }: { societies: Society[] }) {
  return (
    <>
      <PageHeader
        eyebrow="Classification"
        title="Classification societies"
        description="Current/reference class evidence is kept separate from PSC performance, which is assigned using the class certificate recorded at the time of inspection."
      />

      <div className="notice">
        <ShieldCheck size={17} />
        <div>
          <strong>PSC is risk-based sampling.</strong> These figures describe
          recorded inspections and deficiencies. They are not a causal safety
          ranking of classification societies.
        </div>
      </div>

      <div className="classification-grid">
        {societies.map((society) => (
          <article className="society-card" key={society.class_society}>
            <div className="society-card-head">
              <div className="society-mark">{society.class_society}</div>
              <div>
                <h2>{society.class_society}</h2>
                <p>
                  {society.class_evidence_vessels} vessels with public class
                  evidence
                </p>
              </div>
            </div>

            <div className="society-stats">
              <Detail label="Current IACS confirmed">
                {society.current_iacs_confirmed_vessels}
              </Detail>
              <Detail label="2025 evidence only">
                {society.official_2025_only_vessels}
              </Detail>
              <Detail label="Traficom evidence">
                {society.traficom_class_evidence_vessels}
              </Detail>
              <Detail label="Åland 2025 evidence">
                {society.aland_2025_class_evidence_vessels}
              </Detail>
            </div>

            <div className="society-performance">
              <span>Finnish-flag PSC · class at inspection time</span>
              <div className="performance-row">
                <div>
                  <strong>{society.finnish_flag_psc_inspections}</strong>
                  <small>Inspections</small>
                </div>
                <div>
                  <strong>{society.finnish_flag_deficiencies}</strong>
                  <small>Deficiencies</small>
                </div>
                <div>
                  <strong>
                    {society.finnish_flag_deficiencies_per_inspection ?? '—'}
                  </strong>
                  <small>Def. / inspection</small>
                </div>
                <div>
                  <strong>{society.finnish_flag_detentions}</strong>
                  <small>Detentions</small>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}

function PscPage({
  inspections,
  quality,
}: {
  inspections: PscInspection[]
  quality: PscQuality | null
}) {
  const sorted = [...inspections].sort((a, b) =>
    (b.date_of_first_visit ?? '').localeCompare(a.date_of_first_visit ?? ''),
  )

  return (
    <>
      <PageHeader
        eyebrow="Port State Control"
        title="PSC inspections"
        description="Paris MoU inspection history for vessels linked to the Finnish vessel evidence cohorts."
      />

      <div className="metrics-grid compact">
        <MetricCard
          label="Cohort inspections"
          value={formatNumber(quality?.cohort_inspection_count)}
          detail="All flags observed"
          icon={<Gauge size={22} />}
        />
        <MetricCard
          label="Finnish-flag inspections"
          value={formatNumber(quality?.finnish_flag_inspection_count)}
          detail="Used in class performance"
          icon={<Ship size={22} />}
        />
        <MetricCard
          label="Deficiencies"
          value={formatNumber(quality?.finnish_flag_deficiency_count)}
          detail="Finnish-flag inspections"
          icon={<Activity size={22} />}
        />
        <MetricCard
          label="Detentions"
          value={formatNumber(quality?.finnish_flag_detention_count)}
          detail="Finnish-flag inspections"
          icon={<AlertTriangle size={22} />}
        />
      </div>

      <div className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Vessel</th>
                <th>Flag</th>
                <th>Place</th>
                <th>Class at inspection</th>
                <th>Def.</th>
                <th>Detained</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((inspection) => (
                <tr key={inspection.inspection_id}>
                  <td>{formatDate(inspection.date_of_first_visit)}</td>
                  <td>
                    <strong>
                      {inspection.inspection_ship_name ||
                        inspection.reference_vessel_name ||
                        '—'}
                    </strong>
                    <small className="mono">
                      IMO {inspection.imo || '—'}
                    </small>
                  </td>
                  <td>
                    <span
                      className={
                        inspection.is_finnish_flag_inspection
                          ? 'flag-badge fi'
                          : 'flag-badge other'
                      }
                    >
                      {inspection.inspection_flag_code || '—'}
                    </span>
                  </td>
                  <td>{inspection.place_of_inspection || '—'}</td>
                  <td>
                    {inspection.inspection_class_society || (
                      <span className="muted">
                        {inspection.class_assignment_status ===
                        'NO_CLASS_CERTIFICATE'
                          ? 'No class certificate'
                          : '—'}
                      </span>
                    )}
                  </td>
                  <td>{inspection.deficiency_count}</td>
                  <td>
                    {inspection.detained ? (
                      <span className="danger-badge">Yes</span>
                    ) : (
                      'No'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function ChangesPage({ changes }: { changes: ChangeRow[] }) {
  const pick = (row: ChangeRow, keys: string[]) => {
    for (const key of keys) {
      const value = row[key]
      if (value !== null && value !== undefined && value !== '') {
        return String(value)
      }
    }
    return '—'
  }

  return (
    <>
      <PageHeader
        eyebrow="Evidence monitoring"
        title="Changes & signals"
        description="Observed divergences between public evidence sources. A signal is not automatically proof of a registry or class transfer."
      />

      <div className="changes-grid">
        {changes.length === 0 && (
          <div className="state-panel">No change signals in current data.</div>
        )}

        {changes.map((row, index) => (
          <article className="change-card" key={index}>
            <div className="change-type">
              {pick(row, ['change_type', 'signal_type', 'event_type'])}
            </div>
            <h2>
              {pick(row, [
                'vessel_name',
                'reference_vessel_name',
                'name',
                'imo',
              ])}
            </h2>
            <div className="change-imo">
              IMO {pick(row, ['imo', 'verified_imo'])}
            </div>
            <div className="change-values">
              <span>
                {pick(row, ['old_value', 'previous_value', 'from_value'])}
              </span>
              <b>→</b>
              <span>
                {pick(row, ['new_value', 'observed_value', 'to_value'])}
              </span>
            </div>
            <div className="change-footer">
              <span>
                {pick(row, ['detected_as_of', 'event_date', 'observed_date'])}
              </span>
              <span>
                {pick(row, [
                  'confidence',
                  'signal_strength',
                  'evidence_status',
                ])}
              </span>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}


function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="Methodology"
        title="About the data"
        description="Sources, scope and interpretation of the Finnish Fleet Safety dashboard."
      />

      <div className="about-grid">
        <section className="about-card">
          <h2>StatFin</h2>
          <p>
            Official aggregate merchant fleet statistics for the whole of
            Finland, including vessels registered by Traficom and Åland.
          </p>
          <strong>Used for the official whole-Finland fleet total.</strong>
        </section>

        <section className="about-card">
          <h2>Traficom</h2>
          <p>
            Current public vessel-register data used as the main vessel-level
            dataset outside Åland.
          </p>
          <strong>949 vessel rows in the current dashboard snapshot.</strong>
        </section>

        <section className="about-card">
          <h2>Åland</h2>
          <p>
            Vessel-level evidence is derived from the official 2025 Finnish
            merchant-fleet publication. Åland registration authority is
            inferred from home port and is not a current Åland register.
          </p>
          <strong>100 vessels in the 2025 evidence snapshot.</strong>
        </section>

        <section className="about-card">
          <h2>IACS</h2>
          <p>
            IACS Vessels in Class data is used to identify current class
            society evidence where an active class certificate can be
            established.
          </p>
          <strong>Current class is kept separate from statutory/ISM roles.</strong>
        </section>

        <section className="about-card">
          <h2>Paris MoU</h2>
          <p>
            Port State Control inspections, deficiencies and detentions are
            linked by IMO number. Classification performance uses the class
            certificate recorded at the time of inspection.
          </p>
          <strong>
            PSC is risk-based sampling and is not a complete safety ranking.
          </strong>
        </section>

        <section className="about-card">
          <h2>Interpretation</h2>
          <p>
            Data from different sources and dates is intentionally not forced
            into one artificial current-register number. Signals indicate
            source differences or observed changes and may require manual
            verification.
          </p>
          <strong>
            Absence of evidence is not treated as evidence of absence.
          </strong>
        </section>
      </div>
    </>
  )
}

function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <header className="page-header">
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  )
}

function ScopeBadge({ scope }: { scope: string }) {
  return (
    <span
      className={
        scope === 'CURRENT_TRAFICOM_REGISTER'
          ? 'scope-badge traficom'
          : 'scope-badge aland'
      }
    >
      {scope === 'CURRENT_TRAFICOM_REGISTER'
        ? 'Traficom current'
        : 'Åland 2025 evidence'}
    </span>
  )
}

function Detail({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="detail">
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  )
}

function App() {
  const [data, setData] = useState<DashboardData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const [
          overviewResult,
          qualityResult,
          societiesResult,
          inspectionsResult,
          changesResult,
          vesselsPage1,
          vesselsPage2,
        ] = await Promise.all([
          supabase
            .from('public_api_fleet_overview')
            .select('*')
            .order('reference_quarter', { ascending: false })
            .limit(1)
            .maybeSingle(),

          supabase
            .from('public_api_psc_data_quality')
            .select('*')
            .order('generated_at', { ascending: false })
            .limit(1)
            .maybeSingle(),

          supabase
            .from('public_api_classification_societies')
            .select('*')
            .order('class_society'),

          supabase.from('public_api_psc_inspections').select('*'),

          supabase.from('public_api_vessel_changes').select('*'),

          supabase
            .from('public_api_vessels')
            .select('*')
            .range(0, 999),

          supabase
            .from('public_api_vessels')
            .select('*')
            .range(1000, 1999),
        ])

        const results = [
          overviewResult,
          qualityResult,
          societiesResult,
          inspectionsResult,
          changesResult,
          vesselsPage1,
          vesselsPage2,
        ]

        const failed = results.find((result) => result.error)
        if (failed?.error) {
          throw failed.error
        }

        setData({
          overview: overviewResult.data as FleetOverview | null,
          pscQuality: qualityResult.data as PscQuality | null,
          societies: (societiesResult.data ?? []) as unknown as Society[],
          inspections: (inspectionsResult.data ?? []) as unknown as PscInspection[],
          changes: (changesResult.data ?? []) as unknown as ChangeRow[],
          vessels: [
            ...((vesselsPage1.data ?? []) as unknown as Vessel[]),
            ...((vesselsPage2.data ?? []) as unknown as Vessel[]),
          ],
        })
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : 'Unknown data loading error'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <Anchor size={22} />
          </div>
          <div>
            <strong>Finnish Fleet</strong>
            <span>Safety dashboard</span>
          </div>
        </div>

        <nav>
          <NavLink to="/" end onClick={() => setMobileNavOpen(false)}>
            <Gauge size={18} />
            Overview
          </NavLink>
          <NavLink to="/fleet" onClick={() => setMobileNavOpen(false)}>
            <Ship size={18} />
            Fleet
          </NavLink>
          <NavLink
            to="/classification"
            onClick={() => setMobileNavOpen(false)}
          >
            <Building2 size={18} />
            Classification
          </NavLink>
          <NavLink to="/psc" onClick={() => setMobileNavOpen(false)}>
            <ShieldCheck size={18} />
            PSC inspections
          </NavLink>
          <NavLink to="/changes" onClick={() => setMobileNavOpen(false)}>
            <Activity size={18} />
            Changes & signals
          </NavLink>
          <NavLink to="/about" onClick={() => setMobileNavOpen(false)}>
            <Info size={18} />
            About the data
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <span className="live-dot" />
          Supabase production data
        </div>
      </aside>

      {mobileNavOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <main className="main">
        <div className="mobile-topbar">
          <button
            className="icon-button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={21} />
          </button>
          <strong>Finnish Fleet Safety</strong>
        </div>

        <div className="content">
          {loading && <Loading />}
          {error && <ErrorPanel message={error} />}

          {!loading && !error && (
            <Routes>
              <Route path="/" element={<OverviewPage data={data} />} />
              <Route
                path="/fleet"
                element={<FleetPage vessels={data.vessels} />}
              />
              <Route
                path="/classification"
                element={
                  <ClassificationPage societies={data.societies} />
                }
              />
              <Route
                path="/psc"
                element={
                  <PscPage
                    inspections={data.inspections}
                    quality={data.pscQuality}
                  />
                }
              />
              <Route
                path="/changes"
                element={<ChangesPage changes={data.changes} />}
              />
              <Route
                path="/about"
                element={<AboutPage />}
              />
            </Routes>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
