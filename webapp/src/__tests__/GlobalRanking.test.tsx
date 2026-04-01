import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { describe, test, expect, vi, afterEach } from 'vitest'
import { GlobalRanking } from '../components/topRightMenu/ranking/rankingTypes/GlobalRanking'
import '@testing-library/jest-dom'

describe('GlobalRanking Strategy & Fetcher', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  test('shows loading state initially', () => {
    globalThis.fetch = vi.fn(() => new Promise(() => {})) as any

    render(<GlobalRanking />)

    expect(screen.getByText(/Loading leaderboard/i)).toBeInTheDocument()
  })

  test('fetches data, formats time, and renders the global table', async () => {
    const mockApiResponse = {
      rankings: [
        { username: 'SpeedRunner', best_time: 95 },
        { playerid: 'Guest123', best_time: 125 }
      ]
    }

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => mockApiResponse
    }) as any

    render(<GlobalRanking />)

    // Esperamos a que desaparezca el mensaje de carga
    await waitFor(() => {
      expect(screen.queryByText(/Loading leaderboard/i)).not.toBeInTheDocument()
    })

    // Verificamos que se calculó bien el MM:SS y se renderizan los datos
    expect(screen.getByText('Fastest Games — Best Time (Top 20)')).toBeInTheDocument()
    expect(screen.getByText('SpeedRunner')).toBeInTheDocument()
    expect(screen.getByText('01:35')).toBeInTheDocument()
    
    expect(screen.getByText('Guest123')).toBeInTheDocument()
    expect(screen.getByText('02:05')).toBeInTheDocument()
  })
})