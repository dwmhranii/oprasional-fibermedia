import { OfflineAction } from '../types';

const OUTBOX_STORAGE_KEY = 'fibermedia_offline_outbox';

export function getOfflineQueue(): OfflineAction[] {
  try {
    const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineAction[]): void {
  try {
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to save offline queue', err);
  }
}

export function generateIdempotencyKey(actionType: string): string {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `IDEMP-${actionType.toUpperCase()}-${timestamp}-${randomPart}`;
}

export function addToOutbox(
  actionType: OfflineAction['action_type'],
  payload: any
): OfflineAction {
  const queue = getOfflineQueue();
  const newAction: OfflineAction = {
    id: `outbox-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    action_type: actionType,
    payload,
    idempotency_key: generateIdempotencyKey(actionType),
    timestamp: new Date().toISOString(),
    status: 'pending',
    retry_count: 0,
  };

  queue.push(newAction);
  saveOfflineQueue(queue);
  return newAction;
}

export function removeSyncedAction(actionId: string): void {
  const queue = getOfflineQueue();
  const filtered = queue.filter((item) => item.id !== actionId);
  saveOfflineQueue(filtered);
}

export function markActionStatus(
  actionId: string,
  status: OfflineAction['status']
): void {
  const queue = getOfflineQueue();
  const index = queue.findIndex((item) => item.id === actionId);
  if (index !== -1) {
    queue[index].status = status;
    if (status === 'syncing') {
      queue[index].retry_count += 1;
    }
    saveOfflineQueue(queue);
  }
}

export function clearOutbox(): void {
  try {
    localStorage.removeItem(OUTBOX_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear outbox', err);
  }
}
