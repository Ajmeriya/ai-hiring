import { authenticatedFetch } from './authApi.js'
import { ANTI_CHEAT_SERVICE_URL } from '../config/serviceUrls.js'

function resolveStableIdentifier(value) {
  if (value === null || value === undefined) {
    return NaN
  }

  const numericValue = Number(value)
  if (Number.isFinite(numericValue)) {
    return Math.abs(Math.trunc(numericValue))
  }

  const text = String(value).trim()
  if (!text) {
    return NaN
  }

  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0
  }

  return hash
}

export async function createProctoringSession({ candidateId, assessmentId, assessmentType }) {
  const resolvedCandidateId = resolveStableIdentifier(candidateId)
  const resolvedAssessmentId = resolveStableIdentifier(assessmentId)

  if (!Number.isFinite(resolvedCandidateId) || !Number.isFinite(resolvedAssessmentId) || !assessmentType) {
    throw new Error('Invalid anti-cheat session payload')
  }

  const response = await authenticatedFetch(`${ANTI_CHEAT_SERVICE_URL}/sessions`, {
    method: 'POST',
    body: JSON.stringify({
      candidateId: resolvedCandidateId,
      assessmentId: resolvedAssessmentId,
      assessmentType
    })
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload?.message || `Failed to start anti-cheat session: HTTP ${response.status}`)
  }

  return response.json()
}

export async function logProctoringEvent(sessionId, eventType, metadata) {
  if (!sessionId || !eventType) {
    return null
  }

  const response = await authenticatedFetch(`${ANTI_CHEAT_SERVICE_URL}/events`, {
    method: 'POST',
    body: JSON.stringify({
      sessionId,
      eventType,
      metadata: metadata || eventType
    })
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload?.message || `Failed to log anti-cheat event: HTTP ${response.status}`)
  }

  return response.json()
}

export async function completeProctoringSession(sessionId) {
  if (!sessionId) {
    return null
  }

  const response = await authenticatedFetch(`${ANTI_CHEAT_SERVICE_URL}/sessions/${sessionId}/complete`, {
    method: 'PUT'
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload?.message || `Failed to complete anti-cheat session: HTTP ${response.status}`)
  }

  return response.json()
}