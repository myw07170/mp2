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
  type Pokemon,
  type PokemonTypeName,
} from './api/pokemon'
import './App.css'

const routes = {
  list: '/',
  gallery: '/gallery',
  detail: (id: number | string) => `/pokemon/${id}`,
}

let pokemonCache: Pokemon[] | null = null
let pokemonRequest: Promise<Pokemon[]> | null = null

function loadPokemon() {
  if (pokemonCache) {
    return Promise.resolve(pokemonCache)
  }

  pokemonRequest ??= getFirstGenerationPokemon().then((pokemon) => {
    pokemonCache = pokemon
    return pokemon
  })

  return pokemonRequest
}

function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Kanto index</p>
          <h1>Pokemon browser</h1>
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

  const typeOptions = useMemo(() => getTypeOptions(pokemon), [pokemon])
  const filteredPokemon = useMemo(
    () => filterPokemon(pokemon, query, type),
    [pokemon, query, type],
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
        </div>
      </div>

      <PokemonState status={status} error={error}>
        <div className="result-count">
          {filteredPokemon.length} of {pokemon.length}
        </div>
        <div className="pokemon-list">
          {filteredPokemon.map((entry) => (
            <PokemonListItem key={entry.id} pokemon={entry} />
          ))}
        </div>
      </PokemonState>
    </section>
  )
}

function PokemonGalleryPage() {
  const { pokemon, status, error } = usePokemonIndex()

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
        <div className="gallery-grid">
          {pokemon.map((entry) => (
            <Link
              className="gallery-card"
              key={entry.id}
              to={routes.detail(entry.id)}
            >
              <PokemonArtwork pokemon={entry} />
              <span>{entry.displayName}</span>
              <small>#{entry.dexNumber}</small>
            </Link>
          ))}
        </div>
      </PokemonState>
    </section>
  )
}

function PokemonDetailPage() {
  const { pokemon, status, error } = usePokemonIndex()
  const { pokemonId } = useParams()
  const selectedPokemon = pokemon.find(
    ({ id }) => id.toString() === pokemonId?.trim(),
  )

  return (
    <section className="browser-view" aria-labelledby="detail-heading">
      <PokemonState status={status} error={error}>
        {selectedPokemon ? (
          <article className="detail-layout">
            <div className="detail-art">
              <PokemonArtwork pokemon={selectedPokemon} />
            </div>

            <div className="detail-panel">
              <Link className="text-link" to={routes.list}>
                Back to list
              </Link>
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
    <Link className="pokemon-row" to={routes.detail(pokemon.id)}>
      <PokemonArtwork pokemon={pokemon} />
      <span className="dex-number">#{pokemon.dexNumber}</span>
      <strong>{pokemon.displayName}</strong>
      <TypeBadges types={pokemon.types} />
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
    return <p className="state-message">Loading Pokemon from PokeAPI...</p>
  }

  if (status === 'error') {
    return <p className="state-message error">{error}</p>
  }

  return children
}

function NotFoundDetail({ pokemonId }: { pokemonId?: string }) {
  return (
    <div className="state-message">
      No first-generation Pokemon found for id {pokemonId ?? 'unknown'}.
      <Link className="text-link" to={routes.list}>
        Return to the list
      </Link>
    </div>
  )
}

type LoadStatus = 'loading' | 'loaded' | 'error'

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

function getTypeOptions(pokemon: Pokemon[]) {
  return Array.from(new Set(pokemon.flatMap(({ types }) => types))).sort()
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export default App
