import { ReactiveController, ReactiveControllerHost } from "lit";
import { Observable } from "./observable";

export class SubscribeController implements ReactiveController {
  private _unsubscribe?: () => void;
  private _reconnecting = false;

  constructor(
    private readonly host: ReactiveControllerHost,
    private readonly source: Observable,
  ) {
    host.addController(this);
  }

  hostConnected(): void {
    this._unsubscribe = this.source.subscribe(() => {
      this.host.requestUpdate();
    });
    if (this._reconnecting) this.host.requestUpdate();
    this._reconnecting = true;
  }

  hostDisconnected(): void {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = undefined;
    }
  }
}
