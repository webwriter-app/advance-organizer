import { ReactiveController, ReactiveControllerHost } from "lit";

type Listener = () => void;

export abstract class Observable implements ReactiveController {
  private _listeners: Set<Listener> = new Set();

  constructor(protected readonly host: ReactiveControllerHost) {
    host.addController(this);
  }

  hostConnected(): void {}
  hostDisconnected(): void {}

  subscribe(listener: Listener): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  protected notify(): void {
    this.host.requestUpdate();
    this._listeners.forEach((listener) => listener());
  }
}
