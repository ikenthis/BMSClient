// src/components/ViewerPanels/SensorsPanel/hooks/useWebSocket.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { wsManager, WebSocketEvent } from '../../../services/sensorApiService';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectOnMount?: boolean;
  subscribeToSystem?: boolean;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: string) => void;
  onMessage?: (event: WebSocketEvent) => void;
}