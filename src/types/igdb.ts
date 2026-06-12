export interface IgdbGame {
  id: number
  name: string
  first_release_date?: number
  cover?: {
    id: number
    image_id: string
  }
  summary?: string
  total_rating?: number
  platforms?: { id: number; name: string; abbreviation?: string }[]
  genres?: { id: number; name: string }[]
  themes?: { id: number; name: string }[]
  involved_companies?: { id: number; company: { id: number; name: string }; developer?: boolean; publisher?: boolean }[]
  screenshots?: { id: number; image_id: string }[]
  artworks?: { id: number; image_id: string }[]
}
