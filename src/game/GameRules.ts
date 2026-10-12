export type GameEndReason = 'game-over' | 'time-up'

export function getGameEndReason(
  health: number,
  elapsedSeconds: number,
  matchDuration: number
): GameEndReason | null {
  if (health <= 0) return 'game-over'
  if (elapsedSeconds >= matchDuration) return 'time-up'
  return null
}
