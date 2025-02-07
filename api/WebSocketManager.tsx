export default class WebSocketManager {
  private static instance: WebSocketManager;
  private ws: WebSocket | null;
  private listeners: { [channel: string]: ((data: any) => void)[] };
  private isConnected: boolean;
  private userAddress: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private baseReconnectDelay: number = 1000;
  private heartbeatInterval: number = 30000; // 30 seconds
  private heartbeatTimer?: NodeJS.Timeout;
  private reconnectTimer?: NodeJS.Timeout;

  private constructor() {
    this.ws = null;
    this.listeners = {};
    this.isConnected = false;
    this.userAddress = "0x0000000000000000000000000000000000000000"; // Default user address
    this.connect();
  }

  private connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket("wss://api.hyperliquid-testnet.xyz/ws");
      this.setupWebSocketHandlers();
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      this.scheduleReconnect();
    }
  }

  private setupWebSocketHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log("WebSocket connected!");
      this.startHeartbeat();
      this.subscribeToStartupFeeds();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'pong') {
          // Handle heartbeat response
          return;
        }
        const channel = message.channel;
        if (this.listeners[channel]) {
          this.listeners[channel].forEach((listener) => listener(message.data));
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };

    this.ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      if (err instanceof ErrorEvent && err.message.includes('502')) {
        // Handle 502 error specifically
        this.scheduleReconnect();
      }
    };

    this.ws.onclose = () => {
      console.log("WebSocket connection closed.");
      this.isConnected = false;
      this.cleanupConnection();
      this.scheduleReconnect();
    };
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private sendHeartbeat() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      } catch (error) {
        console.error('Failed to send heartbeat:', error);
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000 // Max delay of 30 seconds
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (Attempt ${this.reconnectAttempts})`);
      this.connect();
    }, delay);
  }

  private cleanupConnection() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.onopen = null;
      this.ws = null;
    }
  }

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  private subscribeToStartupFeeds() {
    this.subscribe(
      "allMids",
      { type: "allMids" },
      () => {}
    );

    this.subscribe(
      "webData2",
      { type: "webData2", user: this.userAddress },
      () => {}
    );
  }

  public updateUserAddress(newAddress: string) {
    if (this.userAddress !== newAddress) {
      console.log(`Updating user address from ${this.userAddress} to ${newAddress}`);
      this.unsubscribe("webData2", { type: "webData2", user: this.userAddress });
      this.userAddress = newAddress;
      this.subscribe(
        "webData2",
        { type: "webData2", user: this.userAddress },
        () => {}
      );
    }
  }

  public subscribe(channel: string, subscription: object, listener: (data: any) => void) {
    if (this.isConnected) {
      this.ws?.send(
        JSON.stringify({
          method: "subscribe",
          subscription,
        })
      );
      if (!this.listeners[channel]) {
        this.listeners[channel] = [];
      }
      this.listeners[channel].push(listener);
    }
  }

  public unsubscribe(channel: string, subscription: object, listener?: (data: any) => void) {
    if (this.isConnected) {
      this.ws?.send(
        JSON.stringify({
          method: "unsubscribe",
          subscription,
        })
      );
      if (listener) {
        this.listeners[channel] = this.listeners[channel]?.filter((l) => l !== listener);
      } else {
        delete this.listeners[channel];
      }
    }
  }

  public addListener(channel: string, listener: (data: any) => void) {
    if (!this.listeners[channel]) {
      this.listeners[channel] = [];
    }
    this.listeners[channel].push(listener);
  }

  public removeListener(channel: string, listener: (data: any) => void) {
    if (this.listeners[channel]) {
      this.listeners[channel] = this.listeners[channel].filter((l) => l !== listener);
    }
  }

  public disconnect() {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.ws) {
      this.ws.close();
    }
  }
}
