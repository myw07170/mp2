import { api } from './http'

const FIRST_GENERATION_LIMIT = 151

export type PokemonTypeName =
  | 'normal'
  | 'fire'
  | 'water'
  | 'electric'
  | 'grass'
  | 'ice'
  | 'fighting'
  | 'poison'
  | 'ground'
  | 'flying'
  | 'psychic'
  | 'bug'
  | 'rock'
  | 'ghost'
  | 'dragon'
  | 'dark'
  | 'steel'
  | 'fairy'

export type PokemonStatName =
  | 'hp'
  | 'attack'
  | 'defense'
  | 'special-attack'
  | 'special-defense'
  | 'speed'

export interface PokemonStatBlock {
  hp: number
  attack: number
  defense: number
  specialAttack: number
  specialDefense: number
  speed: number
}

export interface PokemonSprites {
  artwork: string | null
  frontDefault: string | null
  frontShiny: string | null
}

export interface Pokemon {
  id: number
  dexNumber: string
  name: string
  displayName: string
  types: PokemonTypeName[]
  heightMeters: number
  weightKilograms: number
  abilities: string[]
  hiddenAbility: string | null
  stats: PokemonStatBlock
  sprites: PokemonSprites
}

export interface PokeApiNamedResource {
  name: string
  url: string
}

export interface PokeApiPokemonListResponse {
  count: number
  next: string | null
  previous: string | null
  results: PokeApiNamedResource[]
}

export interface PokeApiPokemonDetail {
  id: number
  name: string
  height: number
  weight: number
  abilities: Array<{
    ability: PokeApiNamedResource
    is_hidden: boolean
    slot: number
  }>
  sprites: {
    front_default: string | null
    front_shiny: string | null
    other?: {
      'official-artwork'?: {
        front_default: string | null
      }
    }
  }
  stats: Array<{
    base_stat: number
    effort: number
    stat: PokeApiNamedResource
  }>
  types: Array<{
    slot: number
    type: PokeApiNamedResource
  }>
}

export async function getFirstGenerationPokemon(): Promise<Pokemon[]> {
  const { data } = await api.get<PokeApiPokemonListResponse>('/pokemon', {
    params: {
      limit: FIRST_GENERATION_LIMIT,
      offset: 0,
    },
  })

  const pokemon = await Promise.all(
    data.results.map(async ({ name }) => {
      const detail = await getPokemonDetail(name)

      return normalizePokemon(detail)
    }),
  )

  return pokemon.sort((first, second) => first.id - second.id)
}

export async function getPokemonDetail(
  nameOrId: string | number,
): Promise<PokeApiPokemonDetail> {
  const { data } = await api.get<PokeApiPokemonDetail>(
    `/pokemon/${nameOrId}`,
  )

  return data
}

export function normalizePokemon(pokemon: PokeApiPokemonDetail): Pokemon {
  const hiddenAbility =
    pokemon.abilities.find(({ is_hidden }) => is_hidden)?.ability.name ?? null

  return {
    id: pokemon.id,
    dexNumber: pokemon.id.toString().padStart(3, '0'),
    name: pokemon.name,
    displayName: formatPokemonName(pokemon.name),
    types: [...pokemon.types]
      .sort((first, second) => first.slot - second.slot)
      .map(({ type }) => type.name as PokemonTypeName),
    heightMeters: pokemon.height / 10,
    weightKilograms: pokemon.weight / 10,
    abilities: [...pokemon.abilities]
      .filter(({ is_hidden }) => !is_hidden)
      .sort((first, second) => first.slot - second.slot)
      .map(({ ability }) => formatPokemonName(ability.name)),
    hiddenAbility: hiddenAbility ? formatPokemonName(hiddenAbility) : null,
    stats: normalizeStats(pokemon.stats),
    sprites: {
      artwork:
        pokemon.sprites.other?.['official-artwork']?.front_default ??
        pokemon.sprites.front_default,
      frontDefault: pokemon.sprites.front_default,
      frontShiny: pokemon.sprites.front_shiny,
    },
  }
}

function normalizeStats(stats: PokeApiPokemonDetail['stats']): PokemonStatBlock {
  const byName = new Map(
    stats.map(({ base_stat, stat }) => [stat.name, base_stat]),
  )

  return {
    hp: byName.get('hp') ?? 0,
    attack: byName.get('attack') ?? 0,
    defense: byName.get('defense') ?? 0,
    specialAttack: byName.get('special-attack') ?? 0,
    specialDefense: byName.get('special-defense') ?? 0,
    speed: byName.get('speed') ?? 0,
  }
}

function formatPokemonName(name: string) {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
