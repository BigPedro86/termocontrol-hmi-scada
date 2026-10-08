import { DeviceDriver, SystemState } from './DeviceDriver';

export class WebSocketDriver implements DeviceDriver {
    private socket: WebSocket | null = null;
    private onStateChange: ((state: Partial<SystemState>) => void) | null = null;
    private onOnline: (() => void) | null = null;
    private onOffline: (() => void) | null = null;
    private onRawMessage: ((data: any) => void) | null = null;
    private url: string;
    private token: string;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private deviceOnline = false;

    constructor(url: string, token: string = '') {
        this.url = url;
        this.token = token;
    }

    connect(
        onStateChange: (state: Partial<SystemState>) => void,
        onOnline?: () => void,
        onOffline?: () => void,
        onRawMessage?: (data: any) => void
    ): void {
        this.onStateChange = onStateChange;
        this.onOnline = onOnline ?? null;
        this.onOffline = onOffline ?? null;
        this.onRawMessage = onRawMessage ?? null;
        this.initSocket();
    }

    private buildUrl(): string {
        const sep = this.url.includes('?') ? '&' : '?';
        return this.token ? `${this.url}${sep}token=${encodeURIComponent(this.token)}` : this.url;
    }

    private initSocket() {
        const wsUrl = this.buildUrl();
        console.log(`[WebSocketDriver] Connecting to ${this.url}`);

        try {
            this.socket = new WebSocket(wsUrl);

            this.socket.onopen = () => {
                console.log('[WebSocketDriver] Connected to server');
                if (this.reconnectTimer) {
                    clearTimeout(this.reconnectTimer);
                    this.reconnectTimer = null;
                }
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data as string);

                    if (data.type === 'state' && this.onStateChange) {
                        // O servidor repassa o state completo do ESP32
                        // Inclui heaters, tank, glp, allowedActions, alarms
                        this.onStateChange(data.payload);
                    }
                    else if (data.type === 'device_online') {
                        if (!this.deviceOnline) {
                            this.deviceOnline = true;
                            this.onOnline?.();
                        }
                    }
                    else if (data.type === 'device_offline') {
                        if (this.deviceOnline) {
                            this.deviceOnline = false;
                            this.onOffline?.();
                        }
                    }
                    else if (data.type === 'ack') {
                        // Repassa o ack do ESP32 para o AppContext tratar
                        if (this.onRawMessage) this.onRawMessage(data);
                    }
                    else if (data.type === 'alarm_update') {
                        if (this.onRawMessage) this.onRawMessage(data);
                    }
                    else if (data.type === 'error') {
                        console.warn('[WebSocketDriver] Servidor:', data.message);
                        if (this.onRawMessage) this.onRawMessage(data);
                    }
                    else {
                        if (this.onRawMessage) this.onRawMessage(data);
                    }
                } catch (e) {
                    console.error('[WebSocketDriver] Error parsing message', e);
                }
            };

            this.socket.onclose = (event) => {
                if (event.code === 4001) {
                    console.error('[WebSocketDriver] Token inválido. Requer novo login.');
                    if (this.deviceOnline) { this.deviceOnline = false; this.onOffline?.(); }
                    return;
                }
                console.warn('[WebSocketDriver] Socket closed. Reconnecting in 5s...');
                if (this.deviceOnline) {
                    this.deviceOnline = false;
                    this.onOffline?.();
                }
                this.scheduleReconnect();
            };

            this.socket.onerror = (err) => {
                console.error('[WebSocketDriver] Error:', err);
                this.socket?.close();
            };
        } catch (e) {
            console.error('[WebSocketDriver] Connection failed', e);
            this.scheduleReconnect();
        }
    }

    private scheduleReconnect() {
        if (!this.reconnectTimer) {
            this.reconnectTimer = setTimeout(() => {
                this.reconnectTimer = null;
                this.initSocket();
            }, 5000);
        }
    }

    /** Atualiza o token (chamado após login) e reconecta */
    setToken(token: string) {
        this.token = token;
        this.disconnect();
        if (this.onStateChange) {
            this.connect(this.onStateChange, this.onOnline ?? undefined, this.onOffline ?? undefined, this.onRawMessage ?? undefined);
        }
    }

    disconnect(): void {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
        this.socket?.close();
        this.socket = null;
    }

    updateSettings(settings: any): void {
        const urlChanged = this.url !== settings.endpoint;
        this.url = settings.endpoint;
        if (urlChanged) {
            this.disconnect();
            if (this.onStateChange) {
                this.connect(this.onStateChange, this.onOnline ?? undefined, this.onOffline ?? undefined, this.onRawMessage ?? undefined);
            }
        }
    }

    async sendCommand(equipmentId: string, cmd: string, value: any): Promise<boolean> {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.warn('[WebSocketDriver] Socket not connected');
            return false;
        }
        this.socket.send(JSON.stringify({ type: 'command', target: equipmentId, command: cmd, value }));
        return true;
    }
}
