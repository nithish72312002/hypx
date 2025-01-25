export default class WebSocketManager {
  private static instance: WebSocketManager;
  private ws: WebSocket;
  private listeners: { [channel: string]: ((data: any) => void)[] };
  private isConnected: boolean;
  private userAddress: string;

  private constructor() {
    this.ws = new WebSocket("wss://api.hyperliquid-testnet.xyz/ws");
    this.listeners = {};
    this.isConnected = false;
    this.userAddress = "0x0000000000000000000000000000000000000000"; // Default user address

    this.ws.onopen = () => {
      this.isConnected = true;
      console.log("WebSocket connected!");
      this.subscribeToStartupFeeds();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
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
    };

    this.ws.onclose = () => {
      console.log("WebSocket connection closed.");
      this.isConnected = false;
    };
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
      this.ws.send(
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
      this.ws.send(
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
}
