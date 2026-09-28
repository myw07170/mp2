import { useEffect, useMemo, useState } from 'react'
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  getFirstGenerationPokemon,
  getPokemonDetail,
  normalizePokemon,
  type Pokemon,
  type PokemonTypeName,
} from './api/pokemon'
import './App.css'

const FIRST_GENERATION_MIN = 1
const FIRST_GENERATION_MAX = 151

const routes = {
  list: '/',
  gallery: '/gallery',
  detail: (id: number | string) => `/pokemon/${id}`,
}

let pokemonCache: Pokemon[] | null = null
let pokemonRequest: Promise<Pokemon[]> | null = null
const pokemonDetailCache = new Map<number, Pokemon>()
const pokemonDetailRequests = new Map<number, Promise<Pokemon>>()

function loadPokemon() {
  if (pokemonCache) {
    return Promise.resolve(pokemonCache)
  }

  pokemonRequest ??= getFirstGenerationPokemon().then((pokemon) => {
    pokemonCache = pokemon
    pokemon.forEach((entry) => pokemonDetailCache.set(entry.id, entry))

    return pokemon
  })

  return pokemonRequest
}

function loadPokemonById(id: number) {
  const cachedPokemon =
    pokemonDetailCache.get(id) ?? pokemonCache?.find((entry) => entry.id === id)

  if (cachedPokemon) {
    pokemonDetailCache.set(id, cachedPokemon)
    return Promise.resolve(cachedPokemon)
  }

  const activeRequest = pokemonDetailRequests.get(id)

  if (activeRequest) {
    return activeRequest
  }

  const request = getPokemonDetail(id)
    .then((detail) => {
      const pokemon = normalizePokemon(detail)

      pokemonDetailCache.set(pokemon.id, pokemon)
      pokemonDetailRequests.delete(id)

      return pokemon
    })
    .catch((error: unknown) => {
      pokemonDetailRequests.delete(id)
      throw error
    })

  pokemonDetailRequests.set(id, request)

  return request
}

function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <p className="eyebrow">Kanto index</p>
          <h1>Pokemon browser</h1>
          <p className="header-meta">Field records 001-151</p>
        </div>
        <nav className="route-tabs" aria-label="Pokemon browser views">
          <NavLink to={routes.list} end>
            List
          </NavLink>
          <NavLink to={routes.gallery}>Gallery</NavLink>
        </nav>
      </header>

      <Routes>
        <Route path={routes.list} element={<PokemonListPage />} />
        <Route path={routes.gallery} element={<PokemonGalleryPage />} />
        <Route path="/pokemon/:pokemonId" element={<PokemonDetailPage />} />
        <Route path="*" element={<Navigate to={routes.list} replace />} />
      </Routes>
    </main>
  )
}

function PokemonListPage() {
  const { pokemon, status, error } = usePokemonIndex()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const type = searchParams.get('type') ?? 'all'
  const sort = getSortKey(searchParams.get('sort'))
  const direction = getSortDirection(searchParams.get('direction'))

  const typeOptions = useMemo(() => getTypeOptions(pokemon), [pokemon])
  const filteredPokemon = useMemo(
    () => filterPokemon(pokemon, query, type),
    [pokemon, query, type],
  )
  const sortedPokemon = useMemo(
    () => sortPokemon(filteredPokemon, sort, direction),
    [filteredPokemon, sort, direction],
  )

  function updateSearch(nextQuery: string) {
    const nextParams = new URLSearchParams(searchParams)

    if (nextQuery) {
      nextParams.set('q', nextQuery)
    } else {
      nextParams.delete('q')
    }

    setSearchParams(nextParams)
  }

  function updateType(nextType: string) {
    const nextParams = new URLSearchParams(searchParams)

    if (nextType === 'all') {
      nextParams.delete('type')
    } else {
      nextParams.set('type', nextType)
    }

    setSearchParams(nextParams)
  }

  function updateSort(nextSort: SortKey) {
    const nextParams = new URLSearchParams(searchParams)

    if (nextSort === 'number') {
      nextParams.delete('sort')
    } else {
      nextParams.set('sort', nextSort)
    }

    setSearchParams(nextParams)
  }

  function updateDirection(nextDirection: SortDirection) {
    const nextParams = new URLSearchParams(searchParams)

    if (nextDirection === 'asc') {
      nextParams.delete('direction')
    } else {
      nextParams.set('direction', nextDirection)
    }

    setSearchParams(nextParams)
  }

  return (
    <section className="browser-view" aria-labelledby="list-heading">
      <div className="view-toolbar">
        <div>
          <p className="eyebrow">Searchable list</p>
          <h2 id="list-heading">First 151 Pokemon</h2>
        </div>

        <div className="filters" aria-label="Pokemon filters">
          <label className="search-field">
            <span>Search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Name, number, or type"
            />
          </label>

          <label className="select-field">
            <span>Type</span>
            <select
              value={type}
              onChange={(event) => updateType(event.target.value)}
            >
              <option value="all">All types</option>
              {typeOptions.map((typeName) => (
                <option key={typeName} value={typeName}>
                  {capitalize(typeName)}
                </option>
              ))}
            </select>
          </label>

          <label className="select-field">
            <span>Sort by</span>
            <select
              value={sort}
              onChange={(event) => updateSort(event.target.value as SortKey)}
            >
              <option value="number">Number</option>
              <option value="name">Name</option>
              <option value="height">Height</option>
              <option value="weight">Weight</option>
            </select>
          </label>

          <fieldset className="sort-direction" aria-label="Sort direction">
            <legend>Order</legend>
            <button
              type="button"
              className={direction === 'asc' ? 'active' : undefined}
              onClick={() => updateDirection('asc')}
              aria-pressed={direction === 'asc'}
            >
              Asc
            </button>
            <button
              type="button"
              className={direction === 'desc' ? 'active' : undefined}
              onClick={() => updateDirection('desc')}
              aria-pressed={direction === 'desc'}
            >
              Desc
            </button>
          </fieldset>
        </div>
      </div>

      <PokemonState status={status} error={error}>
        <div className="result-count">
          {sortedPokemon.length} of {pokemon.length}
        </div>
        {sortedPokemon.length > 0 ? (
          <div className="pokemon-list">
            {sortedPokemon.map((entry) => (
              <PokemonListItem key={entry.id} pokemon={entry} />
            ))}
          </div>
        ) : (
          <EmptyState message="No Pokemon match the current list filters." />
        )}
      </PokemonState>
    </section>
  )
}

function PokemonGalleryPage() {
  const { pokemon, status, error } = usePokemonIndex()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedTypes = getSelectedTypes(searchParams.get('types'))

  const typeOptions = useMemo(() => getTypeOptions(pokemon), [pokemon])
  const filteredPokemon = useMemo(
    () => filterPokemonByTypes(pokemon, selectedTypes),
    [pokemon, selectedTypes],
  )

  function updateSelectedType(type: PokemonTypeName) {
    const nextTypes = selectedTypes.includes(type)
      ? selectedTypes.filter((selectedType) => selectedType !== type)
      : [...selectedTypes, type]
    const nextParams = new URLSearchParams(searchParams)

    if (nextTypes.length > 0) {
      nextParams.set('types', nextTypes.join(','))
    } else {
      nextParams.delete('types')
    }

    setSearchParams(nextParams)
  }

  function clearSelectedTypes() {
    const nextParams = new URLSearchParams(searchParams)

    nextParams.delete('types')
    setSearchParams(nextParams)
  }

  return (
    <section className="browser-view" aria-labelledby="gallery-heading">
      <div className="view-toolbar">
        <div>
          <p className="eyebrow">Image gallery</p>
          <h2 id="gallery-heading">Official artwork</h2>
        </div>
        <Link className="text-link" to={routes.list}>
          Search the list
        </Link>
      </div>

      <PokemonState status={status} error={error}>
        <div className="gallery-controls">
          <fieldset
            className="type-filter-group"
            aria-label="Filter gallery by type"
          >
            <legend>Types</legend>
            <div className="type-filter-options">
              {typeOptions.map((typeName) => (
                <label
                  className={`type-filter-chip type-${typeName}`}
                  key={typeName}
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(typeName)}
                    onChange={() => updateSelectedType(typeName)}
                  />
                  <span>{capitalize(typeName)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="gallery-summary">
            <span className="result-count">
              {filteredPokemon.length} of {pokemon.length}
            </span>
            {selectedTypes.length > 0 ? (
              <button
                className="clear-filters"
                type="button"
                onClick={clearSelectedTypes}
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>

        {filteredPokemon.length > 0 ? (
          <div className="gallery-grid">
            {filteredPokemon.map((entry) => (
              <Link
                className="gallery-card"
                key={entry.id}
                to={routes.detail(entry.id)}
              >
                <PokemonArtwork pokemon={entry} />
                <span>{entry.displayName}</span>
                <small>#{entry.dexNumber}</small>
                <TypeBadges types={entry.types} />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState message="No Pokemon match the selected type filters." />
        )}
      </PokemonState>
    </section>
  )
}

function PokemonDetailPage() {
  const { pokemonId } = useParams()
  const routePokemonId = getRoutePokemonId(pokemonId)
  const { pokemon: selectedPokemon, status, error } =
    usePokemonDetail(routePokemonId)
  const previousId = routePokemonId
    ? wrapPokemonId(routePokemonId - 1)
    : FIRST_GENERATION_MAX
  const nextId = routePokemonId
    ? wrapPokemonId(routePokemonId + 1)
    : FIRST_GENERATION_MIN

  return (
    <section className="browser-view" aria-labelledby="detail-heading">
      <PokemonState status={status} error={error}>
        {selectedPokemon ? (
          <article className="detail-layout">
            <div className="detail-art">
              <PokemonArtwork pokemon={selectedPokemon} />
            </div>

            <div className="detail-panel">
              <nav className="detail-nav" aria-label="Pokemon detail navigation">
                <Link className="text-link" to={routes.list}>
                  Back to list
                </Link>
                <div className="detail-step-links">
                  <Link to={routes.detail(previousId)}>
                    Previous #{previousId.toString().padStart(3, '0')}
                  </Link>
                  <Link to={routes.detail(nextId)}>
                    Next #{nextId.toString().padStart(3, '0')}
                  </Link>
                </div>
              </nav>

              <p className="eyebrow">#{selectedPokemon.dexNumber}</p>
              <h2 id="detail-heading">{selectedPokemon.displayName}</h2>

              <TypeBadges types={selectedPokemon.types} />

              <dl className="detail-facts">
                <div>
                  <dt>Height</dt>
                  <dd>{selectedPokemon.heightMeters} m</dd>
                </div>
                <div>
                  <dt>Weight</dt>
                  <dd>{selectedPokemon.weightKilograms} kg</dd>
                </div>
                <div>
                  <dt>Abilities</dt>
                  <dd>{selectedPokemon.abilities.join(', ')}</dd>
                </div>
                {selectedPokemon.hiddenAbility ? (
                  <div>
                    <dt>Hidden ability</dt>
                    <dd>{selectedPokemon.hiddenAbility}</dd>
                  </div>
                ) : null}
              </dl>

              <StatBars pokemon={selectedPokemon} />
            </div>
          </article>
        ) : (
          <NotFoundDetail pokemonId={pokemonId} />
        )}
      </PokemonState>
    </section>
  )
}

function PokemonListItem({ pokemon }: { pokemon: Pokemon }) {
  return (
    <Link className="pokemon-card" to={routes.detail(pokemon.id)}>
      <PokemonArtwork pokemon={pokemon} />
      <span className="dex-number">#{pokemon.dexNumber}</span>
      <div className="pokemon-card-main">
        <strong>{pokemon.displayName}</strong>
        <TypeBadges types={pokemon.types} />
      </div>
      <dl className="pokemon-card-facts">
        <div>
          <dt>Height</dt>
          <dd>{pokemon.heightMeters} m</dd>
        </div>
        <div>
          <dt>Weight</dt>
          <dd>{pokemon.weightKilograms} kg</dd>
        </div>
      </dl>
    </Link>
  )
}

function PokemonArtwork({ pokemon }: { pokemon: Pokemon }) {
  return (
    <img
      src={pokemon.sprites.artwork ?? pokemon.sprites.frontDefault ?? ''}
      alt={pokemon.displayName}
      loading="lazy"
    />
  )
}

function TypeBadges({ types }: { types: PokemonTypeName[] }) {
  return (
    <span className="type-badges">
      {types.map((type) => (
        <span className={`type-badge type-${type}`} key={type}>
          {capitalize(type)}
        </span>
      ))}
    </span>
  )
}

function StatBars({ pokemon }: { pokemon: Pokemon }) {
  const stats = [
    ['HP', pokemon.stats.hp],
    ['Attack', pokemon.stats.attack],
    ['Defense', pokemon.stats.defense],
    ['Sp. Atk', pokemon.stats.specialAttack],
    ['Sp. Def', pokemon.stats.specialDefense],
    ['Speed', pokemon.stats.speed],
  ] as const

  return (
    <div className="stat-bars">
      {stats.map(([label, value]) => (
        <div className="stat-row" key={label}>
          <span>{label}</span>
          <meter min="0" max="160" value={value} />
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  )
}

function PokemonState({
  children,
  error,
  status,
}: {
  children: React.ReactNode
  error: string | null
  status: LoadStatus
}) {
  if (status === 'loading') {
    return (
      <div className="state-message state-loading" role="status">
        <span className="state-kicker">Loading</span>
        <p>Loading Pokemon from PokeAPI...</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="state-message state-error" role="alert">
        <span className="state-kicker">Error</span>
        <p>{error}</p>
      </div>
    )
  }

  return children
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="state-message state-empty">
      <span className="state-kicker">Empty</span>
      <p>{message}</p>
    </div>
  )
}

function NotFoundDetail({ pokemonId }: { pokemonId?: string }) {
  return (
    <div className="state-message state-empty">
      <span className="state-kicker">Not found</span>
      <p>No first-generation Pokemon found for id {pokemonId ?? 'unknown'}.</p>
      <Link className="text-link" to={routes.list}>
        Return to the list
      </Link>
    </div>
  )
}

type LoadStatus = 'loading' | 'loaded' | 'error'
type SortKey = 'number' | 'name' | 'height' | 'weight'
type SortDirection = 'asc' | 'desc'
type PokemonDetailState = {
  error: string | null
  pokemon: Pokemon | null
  pokemonId: number
  status: Exclude<LoadStatus, 'loading'>
}

function usePokemonIndex() {
  const [pokemon, setPokemon] = useState<Pokemon[]>(pokemonCache ?? [])
  const [status, setStatus] = useState<LoadStatus>(
    pokemonCache ? 'loaded' : 'loading',
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    loadPokemon()
      .then((loadedPokemon) => {
        if (!isMounted) {
          return
        }

        setPokemon(loadedPokemon)
        setStatus('loaded')
      })
      .catch(() => {
        if (!isMounted) {
          return
        }

        setStatus('error')
        setError('PokeAPI could not be reached. Check your connection and try again.')
      })

    return () => {
      isMounted = false
    }
  }, [])

  return { pokemon, status, error }
}

function usePokemonDetail(pokemonId: number | null) {
  const cachedPokemon =
    pokemonId === null
      ? null
      : pokemonDetailCache.get(pokemonId) ??
        pokemonCache?.find((entry) => entry.id === pokemonId) ??
        null
  const [detailState, setDetailState] = useState<PokemonDetailState | null>(
    null,
  )

  useEffect(() => {
    if (pokemonId === null || cachedPokemon) {
      return
    }

    let isMounted = true

    loadPokemonById(pokemonId)
      .then((loadedPokemon) => {
        if (!isMounted) {
          return
        }

        setDetailState({
          error: null,
          pokemon: loadedPokemon,
          pokemonId,
          status: 'loaded',
        })
      })
      .catch(() => {
        if (!isMounted) {
          return
        }

        setDetailState({
          error: 'This Pokemon could not be loaded. Check the route and try again.',
          pokemon: null,
          pokemonId,
          status: 'error',
        })
      })

    return () => {
      isMounted = false
    }
  }, [cachedPokemon, pokemonId])

  if (pokemonId === null) {
    return { error: null, pokemon: null, status: 'loaded' as LoadStatus }
  }

  if (cachedPokemon) {
    return { error: null, pokemon: cachedPokemon, status: 'loaded' as LoadStatus }
  }

  if (detailState?.pokemonId === pokemonId) {
    return {
      error: detailState.error,
      pokemon: detailState.pokemon,
      status: detailState.status as LoadStatus,
    }
  }

  return { error: null, pokemon: null, status: 'loading' as LoadStatus }
}

function filterPokemon(pokemon: Pokemon[], query: string, type: string) {
  const normalizedQuery = query.trim().toLowerCase()

  return pokemon.filter((entry) => {
    const matchesType =
      type === 'all' || entry.types.includes(type as PokemonTypeName)

    if (!normalizedQuery) {
      return matchesType
    }

    const matchesQuery =
      entry.name.includes(normalizedQuery) ||
      entry.displayName.toLowerCase().includes(normalizedQuery) ||
      entry.dexNumber.includes(normalizedQuery) ||
      entry.types.some((typeName) => typeName.includes(normalizedQuery))

    return matchesType && matchesQuery
  })
}

function filterPokemonByTypes(
  pokemon: Pokemon[],
  selectedTypes: PokemonTypeName[],
) {
  if (selectedTypes.length === 0) {
    return pokemon
  }

  return pokemon.filter((entry) =>
    selectedTypes.some((type) => entry.types.includes(type)),
  )
}

function sortPokemon(
  pokemon: Pokemon[],
  sort: SortKey,
  direction: SortDirection,
) {
  const multiplier = direction === 'asc' ? 1 : -1

  return [...pokemon].sort((first, second) => {
    const comparison = comparePokemon(first, second, sort)

    if (comparison !== 0) {
      return comparison * multiplier
    }

    return first.id - second.id
  })
}

function comparePokemon(first: Pokemon, second: Pokemon, sort: SortKey) {
  switch (sort) {
    case 'name':
      return first.displayName.localeCompare(second.displayName)
    case 'height':
      return first.heightMeters - second.heightMeters
    case 'weight':
      return first.weightKilograms - second.weightKilograms
    case 'number':
    default:
      return first.id - second.id
  }
}

function getSortKey(value: string | null): SortKey {
  if (
    value === 'name' ||
    value === 'height' ||
    value === 'weight' ||
    value === 'number'
  ) {
    return value
  }

  return 'number'
}

function getSortDirection(value: string | null): SortDirection {
  return value === 'desc' ? 'desc' : 'asc'
}

function getSelectedTypes(value: string | null) {
  if (!value) {
    return []
  }

  return value
    .split(',')
    .filter((type): type is PokemonTypeName => isPokemonTypeName(type))
}

function getRoutePokemonId(value?: string) {
  const parsedId = Number(value?.trim())

  if (
    Number.isInteger(parsedId) &&
    parsedId >= FIRST_GENERATION_MIN &&
    parsedId <= FIRST_GENERATION_MAX
  ) {
    return parsedId
  }

  return null
}

function wrapPokemonId(id: number) {
  if (id < FIRST_GENERATION_MIN) {
    return FIRST_GENERATION_MAX
  }

  if (id > FIRST_GENERATION_MAX) {
    return FIRST_GENERATION_MIN
  }

  return id
}

function getTypeOptions(pokemon: Pokemon[]) {
  return Array.from(new Set(pokemon.flatMap(({ types }) => types))).sort()
}

function isPokemonTypeName(value: string): value is PokemonTypeName {
  return (
    value === 'normal' ||
    value === 'fire' ||
    value === 'water' ||
    value === 'electric' ||
    value === 'grass' ||
    value === 'ice' ||
    value === 'fighting' ||
    value === 'poison' ||
    value === 'ground' ||
    value === 'flying' ||
    value === 'psychic' ||
    value === 'bug' ||
    value === 'rock' ||
    value === 'ghost' ||
    value === 'dragon' ||
    value === 'dark' ||
    value === 'steel' ||
    value === 'fairy'
  )
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export default App
